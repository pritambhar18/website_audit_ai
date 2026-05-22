// src/lib/auditors/responsive.ts
// Captures multi-device screenshots using Playwright and optionally
// runs AI analysis on each screenshot.

import type { Browser } from "playwright-core";
import type { DeviceProfile, DeviceResult, Issue, ResponsiveAuditResult } from "../types";
import { takeFullPageScreenshot } from "../browser";
import { analyzeScreenshot } from "./ai";
import { nanoid } from "../utils";

// ─── Device Matrix ────────────────────────────────────────────────────────────

export const DEVICE_PROFILES: DeviceProfile[] = [
  // ─── Mobile ────────────────────────────────────────────────────────
  {
    name: "iPhone 13 (Portrait)",
    category: "mobile",
    width: 390,
    height: 844,
    orientation: "portrait",
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1",
  },
  {
    name: "iPhone 13 (Landscape)",
    category: "mobile",
    width: 844,
    height: 390,
    orientation: "landscape",
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1",
  },
  {
    name: "iPhone 14 Pro Max (Portrait)",
    category: "mobile",
    width: 430,
    height: 932,
    orientation: "portrait",
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
  },
  {
    name: "iPhone 14 Pro Max (Landscape)",
    category: "mobile",
    width: 932,
    height: 430,
    orientation: "landscape",
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
  },
  {
    name: "iPhone 16 Plus (Portrait)",
    category: "mobile",
    width: 430,
    height: 932,
    orientation: "portrait",
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
  },
  {
    name: "iPhone 16 Plus (Landscape)",
    category: "mobile",
    width: 932,
    height: 430,
    orientation: "landscape",
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
  },

  // ─── Tablet ────────────────────────────────────────────────────────
  {
    name: "Samsung Galaxy Tab S9 FE (Portrait)",
    category: "tablet",
    width: 800,
    height: 1280,
    orientation: "portrait",
    userAgent: "Mozilla/5.0 (Linux; Android 14; SM-X510) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  },
  {
    name: "Samsung Galaxy Tab S9 FE (Landscape)",
    category: "tablet",
    width: 1280,
    height: 800,
    orientation: "landscape",
    userAgent: "Mozilla/5.0 (Linux; Android 14; SM-X510) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  },
  {
    name: "iPad 6th Generation (Portrait)",
    category: "tablet",
    width: 768,
    height: 1024,
    orientation: "portrait",
    userAgent: "Mozilla/5.0 (iPad; CPU OS 12_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/12.0 Mobile/15E148 Safari/604.1",
  },
  {
    name: "iPad 6th Generation (Landscape)",
    category: "tablet",
    width: 1024,
    height: 768,
    orientation: "landscape",
    userAgent: "Mozilla/5.0 (iPad; CPU OS 12_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/12.0 Mobile/15E148 Safari/604.1",
  },
  {
    name: "iPad Air 11-inch (Portrait)",
    category: "tablet",
    width: 820,
    height: 1180,
    orientation: "portrait",
    userAgent: "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  },
  {
    name: "iPad Air 11-inch (Landscape)",
    category: "tablet",
    width: 1180,
    height: 820,
    orientation: "landscape",
    userAgent: "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  },
  {
    name: "iPad Pro 12.9-inch (Portrait)",
    category: "tablet",
    width: 1024,
    height: 1366,
    orientation: "portrait",
    userAgent: "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  },
  {
    name: "iPad Pro 12.9-inch (Landscape)",
    category: "tablet",
    width: 1366,
    height: 1024,
    orientation: "landscape",
    userAgent: "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  },

  // ─── Desktop ───────────────────────────────────────────────────────
  {
    name: "Desktop Chrome (1920×1080)",
    category: "desktop",
    width: 1920,
    height: 1080,
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  },
  {
    name: "Desktop Safari / WebKit (1440×900)",
    category: "desktop",
    width: 1440,
    height: 900,
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_4) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Safari/605.1.15",
  },
];

// ─── Screenshot + Analysis ────────────────────────────────────────────────────

async function captureDevice(
  browser: Browser,
  url: string,
  device: DeviceProfile,
  runAI: boolean
): Promise<DeviceResult> {
  const context = await browser.newContext({
    viewport: { width: device.width, height: device.height },
    userAgent: device.userAgent,
    ignoreHTTPSErrors: true,
  });

  const page = await context.newPage();
  const startTime = Date.now();
  const consoleErrors: string[] = [];

  page.on("pageerror", (err) => {
    consoleErrors.push(`Uncaught JS Error: ${err.message}`);
  });
  
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      consoleErrors.push(`Console Error: ${msg.text()}`);
    }
  });

  try {
    await page
      .goto(url, { waitUntil: "networkidle", timeout: 30_000 })
      .catch(() =>
        page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 })
      );
  } catch {
    // Page failed to load — still capture whatever rendered
  }

  const loadTimeMs = Date.now() - startTime;
  const buf = await takeFullPageScreenshot(page);
  const screenshotBase64 = buf.toString("base64");

  await context.close();

  let aiIssues: Issue[] = [];
  if (runAI) {
    try {
      aiIssues = await analyzeScreenshot(screenshotBase64, device.name, {
        category: device.category,
        width: device.width,
        height: device.height,
      });
    } catch {
      // AI analysis failure is non-fatal
    }
  }

  // Deduplicate console errors and add them as issues
  const uniqueConsoleErrors = Array.from(new Set(consoleErrors));
  for (const err of uniqueConsoleErrors.slice(0, 5)) { // Limit to 5 per device to avoid spam
    aiIssues.push({
      id: nanoid(),
      severity: "medium",
      title: "Console Error Detected",
      description: err,
      recommendation: "Check the browser console logs and fix the JavaScript error.",
      device: device.name
    });
  }

  return {
    device,
    screenshotBase64,
    aiIssues,
    loadTimeMs,
  };
}

export async function auditResponsive(
  browser: Browser,
  url: string,
  runAI: boolean,
  onProgress?: (device: DeviceProfile, index: number, total: number) => void
): Promise<ResponsiveAuditResult> {
  const devices = DEVICE_PROFILES;
  const results: DeviceResult[] = [];
  const allIssues: Issue[] = [];

  for (let i = 0; i < devices.length; i++) {
    const device = devices[i];
    onProgress?.(device, i + 1, devices.length);

    try {
      const result = await captureDevice(browser, url, device, runAI);
      results.push(result);
      allIssues.push(...result.aiIssues);

      // Check for slow load times
      if (result.loadTimeMs > 5000) {
        allIssues.push({
          id: nanoid(),
          severity: result.loadTimeMs > 10000 ? "high" : "medium",
          title: `Slow Page Load on ${device.name}`,
          description: `Page took ${(result.loadTimeMs / 1000).toFixed(1)}s to load on ${device.name}.`,
          recommendation:
            "Optimize assets, enable caching, and consider lazy loading for better performance.",
          device: device.name,
        });
      }
    } catch {
      // Skip failed device silently
    }
  }

  return { devices: results, issues: allIssues };
}
