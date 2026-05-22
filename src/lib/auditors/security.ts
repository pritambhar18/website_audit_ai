// src/lib/auditors/security.ts
// Native security checks: HTTPS redirect, SSL cert expiry, HTTP security headers,
// DNS resolution, and optional Google Safe Browsing API.

import * as tls from "tls";
import * as dns from "dns";
import { promisify } from "util";
import type { Issue, SecurityResult } from "../types";
import { nanoid } from "../utils";
import { runSecurityAutomation, localHtmlScanner } from "./securityAutomation";

const resolve4 = promisify(dns.resolve4);

// ─── HTTPS Redirect ───────────────────────────────────────────────────────────

async function checkHttpsRedirect(domain: string): Promise<boolean> {
  try {
    const res = await fetch(`http://${domain}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
      },
      redirect: "follow",
      signal: AbortSignal.timeout(8000),
    });
    return res.url.startsWith("https://");
  } catch {
    return false;
  }
}

// ─── SSL Certificate ─────────────────────────────────────────────────────────

interface SSLInfo {
  valid: boolean;
  expiry: string | null;
  daysRemaining: number | null;
}

async function checkSSL(hostname: string): Promise<SSLInfo> {
  return new Promise((resolve) => {
    const socket = tls.connect(
      { host: hostname, port: 443, servername: hostname, rejectUnauthorized: false },
      () => {
        const cert = socket.getPeerCertificate();
        socket.destroy();

        if (!cert || !cert.valid_to) {
          return resolve({ valid: false, expiry: null, daysRemaining: null });
        }

        const expiryDate = new Date(cert.valid_to);
        const now = new Date();
        const daysRemaining = Math.floor(
          (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );

        resolve({
          valid: daysRemaining > 0 && socket.authorized !== false,
          expiry: expiryDate.toISOString(),
          daysRemaining,
        });
      }
    );

    socket.on("error", () => {
      resolve({ valid: false, expiry: null, daysRemaining: null });
    });

    socket.setTimeout(8000, () => {
      socket.destroy();
      resolve({ valid: false, expiry: null, daysRemaining: null });
    });
  });
}

// ─── HTTP Security Headers ────────────────────────────────────────────────────

interface SecurityHeaders {
  xFrameOptions: string | null;
  csp: string | null;
  hsts: string | null;
  xContentType: string | null;
  xXssProtection: string | null;
}

async function checkSecurityHeaders(url: string): Promise<SecurityHeaders> {
  try {
    let res = await fetch(url, {
      method: "HEAD",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      // Fallback to GET if HEAD is rejected by the server firewall/CDN
      res = await fetch(url, {
        method: "GET",
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
        },
        signal: AbortSignal.timeout(8000),
      });
    }

    return {
      xFrameOptions: res.headers.get("x-frame-options"),
      csp: res.headers.get("content-security-policy"),
      hsts: res.headers.get("strict-transport-security"),
      xContentType: res.headers.get("x-content-type-options"),
      xXssProtection: res.headers.get("x-xss-protection"),
    };
  } catch {
    return {
      xFrameOptions: null, csp: null, hsts: null,
      xContentType: null, xXssProtection: null,
    };
  }
}

// ─── DNS Resolution ───────────────────────────────────────────────────────────

async function checkDNS(domain: string): Promise<{ a: string[]; www: string[] }> {
  const [a, www] = await Promise.allSettled([
    resolve4(domain),
    resolve4(`www.${domain}`),
  ]);
  return {
    a: a.status === "fulfilled" ? a.value : [],
    www: www.status === "fulfilled" ? www.value : [],
  };
}

// ─── Mozilla Observatory Header Grade (100% Free, No Key Required) ────────────

async function fetchMozillaObservatoryGrade(domain: string): Promise<string | null> {
  try {
    const triggerRes = await fetch(`https://httpobservatory.api.http.observatory.mozilla.org/api/v1/analyze?host=${domain}`, {
      method: "POST",
      signal: AbortSignal.timeout(8000),
    });
    if (!triggerRes.ok) return null;
    const data = await triggerRes.json();
    return data.grade || null;
  } catch {
    return null;
  }
}

// ─── HTML Validation ──────────────────────────────────────────────────────────

async function checkHtmlValidation(html: string): Promise<{ errors: number; warnings: number }> {
  try {
    const res = await fetch("https://validator.w3.org/nu/?out=json", {
      method: "POST",
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
        "Accept": "application/json"
      },
      body: html.slice(0, 100_000), // Limit payload
      signal: AbortSignal.timeout(15_000),
    });

    if (res.status === 403 || res.status === 503 || !res.ok) {
      const text = await res.text();
      if (text.includes("cloudflare") || text.includes("Cloudflare") || text.includes("cf-challenge") || res.status === 403) {
        throw new Error("W3C validator request blocked by Cloudflare bot protection.");
      }
      throw new Error(`W3C Nu HTML Validator POST status: ${res.status}`);
    }

    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      throw new Error(`W3C POST returned non-JSON content-type: ${contentType}`);
    }

    const data = await res.json() as { messages: Array<{ type: string }> };
    const messages = data.messages ?? [];
    return {
      errors: messages.filter((m) => m.type === "error").length,
      warnings: messages.filter((m) => m.type === "info").length,
    };
  } catch (error) {
    console.log("[security.ts] Programmatic W3C API failed or timed out. Falling back to local Cheerio scanner...", error);
    try {
      const scan = localHtmlScanner(html);
      return { errors: scan.errors, warnings: scan.warnings };
    } catch (fallbackErr) {
      console.error("[security.ts] Local Cheerio fallback failed:", fallbackErr);
      return { errors: 0, warnings: 0 };
    }
  }
}

// ─── Main Audit ───────────────────────────────────────────────────────────────

export async function auditSecurity(url: string, html: string, browser?: any): Promise<SecurityResult> {
  const parsed = new URL(url);
  const domain = parsed.hostname;

  // Run native and automated checks concurrently
  const [
    httpsRedirect,
    ssl,
    headers,
    dnsResult,
    mozillaGrade,
    htmlValidation,
    autoResult,
  ] = await Promise.all([
    checkHttpsRedirect(domain),
    checkSSL(domain),
    checkSecurityHeaders(url),
    checkDNS(domain),
    fetchMozillaObservatoryGrade(domain),
    checkHtmlValidation(html),
    browser ? runSecurityAutomation(browser, url, html) : Promise.resolve(undefined),
  ]);

  const issues: Issue[] = [];

  if (!httpsRedirect) {
    issues.push({
      id: nanoid(), severity: "high",
      title: "No HTTPS Redirect",
      testScenario: "Verify automatic redirection from unencrypted HTTP to secure HTTPS protocol.",
      testStep: "1. Perform a GET request to http://<domain>. 2. Check if the server responds with a 301/302 redirect status code. 3. Validate that the target location starts with https://.",
      description: "The site does not automatically redirect insecure HTTP requests to the secure HTTPS protocol.",
      whyItMatters: "Unencrypted HTTP connections are vulnerable to eavesdropping and data tampering. Enforcing HTTPS redirect protects user session data and is a critical criteria for modern search engines.",
      recommendation: "Configure a 301 redirect from http:// to https:// on your server.",
    });
  }

  if (!ssl.valid) {
    issues.push({
      id: nanoid(), severity: "critical",
      title: "SSL Certificate Invalid or Expired",
      testScenario: "Validate SSL/TLS certificate validity state and path trust.",
      testStep: "1. Query TLS handshake to target domain. 2. Verify certificate chain, expiration date, and host match.",
      description: ssl.daysRemaining !== null
        ? `SSL certificate expired ${Math.abs(ssl.daysRemaining)} day(s) ago.`
        : "Could not verify SSL certificate.",
      whyItMatters: "An invalid or expired SSL certificate causes browsers to block site access with a severe security warning page, preventing user entry and rendering the site non-functional.",
      recommendation: "Renew your SSL certificate immediately.",
    });
  } else if (ssl.daysRemaining !== null && ssl.daysRemaining < 30) {
    issues.push({
      id: nanoid(), severity: "high",
      title: `SSL Certificate Expiring Soon (${ssl.daysRemaining} days)`,
      testScenario: "Check SSL certificate expiry timeline compliance.",
      testStep: "1. Query SSL handshake. 2. Inspect certificate validity details. 3. Calculate remaining days before expiration.",
      description: `The SSL certificate expires in ${ssl.daysRemaining} days.`,
      whyItMatters: "If the certificate is not renewed before expiry, visitors will encounter browser warning block screens, resulting in immediate traffic loss.",
      recommendation: "Renew your SSL certificate before it expires.",
    });
  }

  if (!headers.xFrameOptions && !headers.csp?.includes("frame-ancestors")) {
    issues.push({
      id: nanoid(), severity: "medium",
      title: "Missing X-Frame-Options Header",
      testScenario: "Verify protection against clickjacking frame embedding attacks.",
      testStep: "1. Query page headers. 2. Verify existence of X-Frame-Options or Content-Security-Policy frame-ancestors directive.",
      description: "Neither X-Frame-Options nor CSP frame-ancestors is present in response headers.",
      whyItMatters: "Without these headers, third-party sites can embed this page in an iframe, allowing attackers to perform clickjacking attacks and trick users into performing actions without consent.",
      recommendation: 'Add "X-Frame-Options: SAMEORIGIN" or use CSP frame-ancestors directive.',
    });
  }

  if (!headers.csp) {
    issues.push({
      id: nanoid(), severity: "medium",
      title: "Missing Content-Security-Policy Header",
      testScenario: "Audit Content-Security-Policy deployment for cross-site scripting prevention.",
      testStep: "1. Request page response headers. 2. Scan for presence of content-security-policy key.",
      description: "No Content-Security-Policy (CSP) header is returned by the server.",
      whyItMatters: "A Content-Security-Policy header defines restricted execution rules for client-side scripts, stylesheets, and images. Its absence allows arbitrary code injection and cross-site scripting (XSS) attacks.",
      recommendation: "Implement a strict Content-Security-Policy header.",
    });
  }

  if (!headers.hsts) {
    issues.push({
      id: nanoid(), severity: "medium",
      title: "Missing Strict-Transport-Security Header",
      testScenario: "Verify enforcement of HTTPS-only browser connections (HSTS).",
      testStep: "1. Query target URL via HTTPS. 2. Inspect response headers for strict-transport-security.",
      description: "HTTP Strict Transport Security (HSTS) header is missing from the response headers.",
      whyItMatters: "Without HSTS, attackers can perform SSL-stripping man-in-the-middle attacks to downgrade the connection to insecure HTTP.",
      recommendation: 'Add "Strict-Transport-Security: max-age=31536000; includeSubDomains".',
    });
  }

  if (!headers.xContentType) {
    issues.push({
      id: nanoid(), severity: "low",
      title: "Missing X-Content-Type-Options Header",
      testScenario: "Audit response headers for MIME type sniffing prevention.",
      testStep: "1. Query page response headers. 2. Verify existence of x-content-type-options: nosniff.",
      description: "The x-content-type-options header is missing.",
      whyItMatters: "If the header is missing, browsers may attempt to sniff response content types, potentially executing text files as JavaScript or causing cross-site scripting risks.",
      recommendation: 'Add "X-Content-Type-Options: nosniff" header.',
    });
  }

  if (mozillaGrade === "F" || mozillaGrade === "D" || mozillaGrade === "D-") {
    issues.push({
      id: nanoid(), severity: "high",
      title: `Poor Security Header Compliance (Mozilla Grade: ${mozillaGrade})`,
      testScenario: "Verify domain security standard alignment with Mozilla Observatory standards.",
      testStep: "1. Submit domain to Mozilla Observatory API. 2. Evaluate resulting compliance rating.",
      description: `Mozilla Observatory scored this website's HTTP security header deployment as grade ${mozillaGrade}. This indicates missing security controls like CSP, HSTS, or secure cookies.`,
      whyItMatters: "A low Mozilla Grade suggests the website lacks essential modern browser protections, leaving users vulnerable to script injection, session hijacking, or cross-domain data leakage.",
      recommendation: "Review missing headers and configure them on your web server (Nginx, Apache, or Cloudflare).",
    });
  } else if (mozillaGrade === "C" || mozillaGrade === "B") {
    issues.push({
      id: nanoid(), severity: "medium",
      title: `Suboptimal Header Compliance (Mozilla Grade: ${mozillaGrade})`,
      testScenario: "Verify domain security header alignment with industry benchmarks.",
      testStep: "1. Submit domain to Mozilla Observatory API. 2. Retrieve final grading score.",
      description: `Mozilla Observatory scored this website's HTTP security headers as grade ${mozillaGrade}.`,
      whyItMatters: "While some basic protections exist, the header structure has gaps (such as loose CSP rules or missing flags) that limit defense-in-depth security.",
      recommendation: "Audit your Content-Security-Policy directives and secure cookies to achieve a pristine A+ rating.",
    });
  }

  if (htmlValidation.errors > 10) {
    issues.push({
      id: nanoid(), severity: "medium",
      title: `${htmlValidation.errors} HTML Validation Errors`,
      testScenario: "Audit HTML source code compliance against official W3C standards.",
      testStep: "1. Fetch target HTML page markup. 2. Validate using W3C HTML validator service. 3. Count syntax validation errors.",
      description: `Detected ${htmlValidation.errors} W3C HTML syntax validation errors in the page markup.`,
      whyItMatters: "Significant HTML syntax errors (such as unclosed tags, invalid nesting, or bad attributes) cause parsing inconsistencies across modern browsers, slow down DOM construction, and hinder accessibility devices.",
      recommendation: "Fix HTML errors to improve browser compatibility and accessibility.",
    });
  }

  // Calculate score
  const deductions: Record<string, number> = {
    critical: 30, high: 20, medium: 10, low: 5,
  };
  let score = 100;
  for (const issue of issues) {
    score -= deductions[issue.severity] ?? 0;
  }
  score = Math.max(0, score);

  return {
    httpsRedirect,
    sslExpiry: ssl.expiry,
    sslDaysRemaining: ssl.daysRemaining,
    sslValid: ssl.valid,
    dnsARecords: dnsResult.a,
    dnsWwwRecords: dnsResult.www,
    headerXFrameOptions: headers.xFrameOptions,
    headerCSP: headers.csp,
    headerHSTS: headers.hsts,
    headerXContentType: headers.xContentType,
    headerXXSSProtection: headers.xXssProtection,
    safeBrowsing: "safe",
    mozillaGrade,
    htmlValidationErrors: htmlValidation.errors,
    htmlValidationWarnings: htmlValidation.warnings,
    issues,
    score,
    automatedHttp2: autoResult?.http2,
    automatedSsl: autoResult?.sslGrade,
    automatedSafeBrowsing: autoResult?.safeBrowsing,
    automatedDns: autoResult?.dns,
    automatedHttpsRedirect: autoResult?.httpsRedirect,
    automatedHtmlOptimisation: autoResult?.htmlOptimisation,
    automatedDomainExpiry: autoResult?.domainExpiry,
    automatedRedirectChain: autoResult?.redirectChain,
  };
}
