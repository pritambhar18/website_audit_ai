// src/lib/browser.ts
// Playwright browser factory — works on both local Windows (playwright) and
// serverless Linux (playwright-core + @sparticuz/chromium-min)

import type { Browser, Page, BrowserContext } from "playwright-core";

let _browser: Browser | null = null;

/**
 * Returns a shared Playwright Chromium browser instance.
 * Reuses the instance if already launched (important for serverless cold starts).
 *
 * On Vercel/serverless we load @sparticuz/chromium-min via new Function()
 * so that Turbopack / webpack never statically analyses the import path
 * (serverExternalPackages alone is not enough with Turbopack).
 */
export async function getBrowser(): Promise<Browser> {
  if (_browser && _browser.isConnected()) {
    return _browser;
  }

  const isVercel = process.env.VERCEL === "1";

  if (isVercel) {
    // Serverless: load sparticuz chromium via an opaque dynamic import so
    // that bundlers never try to resolve the module at build time.
    // new Function prevents static analysis by Turbopack / webpack.
    // eslint-disable-next-line no-new-func
    const chromium = (
      await new Function('return import("@sparticuz/chromium-min")')()
    ).default;

    const { chromium: playwrightChromium } = await import("playwright-core");
    const executablePath = await chromium.executablePath();
    _browser = await playwrightChromium.launch({
      args: chromium.args,
      executablePath,
      headless: true,
    });
  } else {
    // Local development (Windows / Mac / Linux): use full playwright install
    const { chromium } = await import("playwright");
    _browser = await chromium.launch({ headless: true });
  }

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
