// src/lib/browser.ts
// Playwright browser factory — uses full Playwright with its bundled Chromium.
// Works on local dev (Windows/Mac/Linux) and on Render/Docker persistent servers.

import type { Browser, Page, BrowserContext } from "playwright-core";
import path from "path";

// Set Playwright browser path to the project directory on Render/Production
if (process.env.RENDER || process.env.NODE_ENV === "production") {
  process.env.PLAYWRIGHT_BROWSERS_PATH = path.join(process.cwd(), "ms-playwright");
}

let _browser: Browser | null = null;

/**
 * Returns a shared Playwright Chromium browser instance.
 * Reuses the instance if already launched.
 */
export async function getBrowser(): Promise<Browser> {
  if (_browser && _browser.isConnected()) {
    return _browser;
  }

  const { chromium } = await import("playwright");
  _browser = await chromium.launch({ headless: true });

  return _browser;
}

export interface ViewportConfig {
  width: number;
  height: number;
  userAgent?: string;
}

/**
 * Opens a new page at the given URL with the specified viewport.
 * Returns the page (caller is responsible for closing).
 */
export async function getPage(
  url: string,
  viewport: ViewportConfig,
  context?: BrowserContext
): Promise<Page> {
  const browser = await getBrowser();

  const ctx =
    context ??
    (await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      userAgent: viewport.userAgent,
      ignoreHTTPSErrors: true,
    }));

  const page = await ctx.newPage();

  try {
    await page.goto(url, { waitUntil: "networkidle", timeout: 30_000 });
  } catch {
    // Fallback — some pages never become networkidle
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
  }

  return page;
}

/**
 * Takes a full-page screenshot and returns it as a Buffer.
 */
export async function takeFullPageScreenshot(page: Page): Promise<Buffer> {
  const buf = await page.screenshot({ fullPage: true, type: "jpeg", quality: 80 });
  return Buffer.from(buf);
}

/**
 * Closes the shared browser (useful for cleanup in tests).
 */
export async function closeBrowser(): Promise<void> {
  if (_browser) {
    await _browser.close();
    _browser = null;
  }
}
