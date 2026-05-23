// src/lib/auditors/links.ts
// Validates all hyperlinks found on a page — checks HTTP status, follows redirects,
// and classifies results as OK / redirect / broken.

import type { Page } from "playwright-core";
import type { Issue, LinkResult, LinksAuditResult } from "../types";
import { nanoid } from "../utils";

const CONCURRENT_CHECKS = 25;
const TIMEOUT_MS = 4000;

/** Extracts all unique, absolute hrefs from the page. */
async function extractLinks(page: Page, baseUrl: string): Promise<string[]> {
  const rawHrefs: string[] = await page.evaluate(() => {
    const anchors = Array.from(document.querySelectorAll("a[href]"));
    return anchors.map((a) => (a as HTMLAnchorElement).href);
  });

  const base = new URL(baseUrl);
  const seen = new Set<string>();
  const links: string[] = [];

  for (const href of rawHrefs) {
    try {
      const parsed = new URL(href, base.origin);
      // Only HTTP/HTTPS links, skip mailto:/tel:/javascript:
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") continue;
      const clean = parsed.href.split("#")[0]; // remove fragment
      if (!seen.has(clean)) {
        seen.add(clean);
        links.push(clean);
      }
    } catch {
      // Invalid URL — skip
    }
  }

  return links;
}

/** Checks a single URL and returns its status. */
async function checkLink(url: string): Promise<LinkResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; WebAuditBot/1.0; +https://webaudit.dev)",
      },
    });

    clearTimeout(timer);

    return {
      url,
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      redirectedTo: response.url !== url ? response.url : undefined,
    };
  } catch (err: unknown) {
    clearTimeout(timer);
    const message = err instanceof Error ? err.message : String(err);
    return {
      url,
      status: null,
      statusText: "Error",
      ok: false,
      error: message.includes("abort") ? "Timeout" : message,
    };
  }
}

/** Runs checks in batches of CONCURRENT_CHECKS. */
async function checkAllLinks(urls: string[]): Promise<LinkResult[]> {
  const results: LinkResult[] = [];
  for (let i = 0; i < urls.length; i += CONCURRENT_CHECKS) {
    const batch = urls.slice(i, i + CONCURRENT_CHECKS);
    const batchResults = await Promise.all(batch.map(checkLink));
    results.push(...batchResults);
  }
  return results;
}

/** Highlights broken links on the page by injecting CSS. */
async function highlightBrokenLinks(
  page: Page,
  brokenUrls: Set<string>
): Promise<void> {
  if (brokenUrls.size === 0) return;
  const urls = Array.from(brokenUrls);
  await page.evaluate((broken: string[]) => {
    const anchors = document.querySelectorAll("a[href]");
    anchors.forEach((a) => {
      const href = (a as HTMLAnchorElement).href.split("#")[0];
      if (broken.includes(href)) {
        (a as HTMLElement).style.outline = "3px solid red";
        (a as HTMLElement).style.background = "rgba(255,0,0,0.15)";
      }
    });
  }, urls);
}

export async function auditLinks(
  page: Page,
  baseUrl: string
): Promise<LinksAuditResult> {
  const urls = await extractLinks(page, baseUrl);
  const linkResults = await checkAllLinks(urls);

  const brokenUrls = new Set(
    linkResults.filter((r) => !r.ok).map((r) => r.url)
  );

  // Highlight broken links and take screenshot
  await highlightBrokenLinks(page, brokenUrls);
  const screenshot = await page.screenshot({ fullPage: false, type: "jpeg", quality: 75 });
  const screenshotBase64 = Buffer.from(screenshot).toString("base64");

  const issues: Issue[] = linkResults
    .filter((r) => !r.ok)
    .map((r) => ({
      id: nanoid(),
      severity:
        r.status === 404
          ? "high"
          : r.status === null
          ? "medium"
          : r.status >= 500
          ? "critical"
          : "low",
      title: `Broken Link: ${r.status ?? r.error}`,
      description: `Link to "${r.url}" returned ${r.status ?? "no response"} (${r.statusText}).`,
      recommendation:
        r.status === 404
          ? "Remove or update the link to point to a valid resource."
          : r.status === null
          ? "Verify the URL is accessible and the server is online."
          : "Investigate the server error or redirect chain.",
      url: r.url,
    }));

  return {
    total: linkResults.length,
    ok: linkResults.filter((r) => r.ok).length,
    broken: linkResults.filter((r) => !r.ok).length,
    redirects: linkResults.filter((r) => r.ok && r.redirectedTo).length,
    links: linkResults,
    screenshotBase64,
    issues,
  };
}
