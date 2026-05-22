// src/lib/auditors/seo.ts
// SEO checks via direct HTML parsing — title, meta description, OG tags,
// heading structure, image alt attributes, robots.txt and sitemap detection.

import type { Issue, SEOResult } from "../types";
import { nanoid } from "../utils";

interface SEOCheckInput {
  url: string;
  html: string;
}

function parseMetaTag(html: string, attrName: string, attrValue: string): string | null {
  const regex = new RegExp(
    `<meta[^>]+${attrName}=["']${attrValue}["'][^>]+content=["']([^"']+)["']`,
    "i"
  );
  const regex2 = new RegExp(
    `<meta[^>]+content=["']([^"']+)["'][^>]+${attrName}=["']${attrValue}["']`,
    "i"
  );
  return (html.match(regex) || html.match(regex2))?.[1] ?? null;
}

function parseTitle(html: string): string | null {
  const m = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return m?.[1]?.trim() ?? null;
}

function countH1(html: string): number {
  return (html.match(/<h1[\s>]/gi) ?? []).length;
}

function countImagesWithoutAlt(html: string): number {
  const imgs = html.match(/<img[^>]*>/gi) ?? [];
  return imgs.filter((tag) => !/alt=["'][^"']+["']/i.test(tag)).length;
}

function parseCanonical(html: string): string | null {
  const m = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i);
  const m2 = html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["']/i);
  return (m || m2)?.[1] ?? null;
}

function countStructuredData(html: string): number {
  return (html.match(/<script[^>]+type=["']application\/ld\+json["']/gi) ?? []).length;
}

async function fetchRobotsTxt(baseUrl: string): Promise<{ exists: boolean; content: string | null }> {
  try {
    const res = await fetch(new URL("/robots.txt", baseUrl).href, { signal: AbortSignal.timeout(8000) });
    if (res.ok) {
      const text = await res.text();
      return { exists: true, content: text.slice(0, 2000) };
    }
    return { exists: false, content: null };
  } catch {
    return { exists: false, content: null };
  }
}

async function checkSitemap(baseUrl: string, robotsContent: string | null): Promise<boolean> {
  // Check if sitemap is mentioned in robots.txt
  if (robotsContent && /sitemap:/i.test(robotsContent)) return true;

  // Try common sitemap URLs
  const candidates = ["/sitemap.xml", "/sitemap_index.xml", "/sitemap.txt"];
  for (const path of candidates) {
    try {
      const res = await fetch(new URL(path, baseUrl).href, {
        method: "HEAD",
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) return true;
    } catch {
      // continue
    }
  }
  return false;
}

async function fetchImageAsBase64(imageUrl: string, baseUrl: string): Promise<string | null> {
  if (!imageUrl) return null;
  try {
    let resolvedUrl = imageUrl;
    if (!imageUrl.startsWith("http://") && !imageUrl.startsWith("https://")) {
      resolvedUrl = new URL(imageUrl, baseUrl).href;
    }
    const res = await fetch(resolvedUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
        "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8"
      },
      signal: AbortSignal.timeout(8000)
    });
    if (!res.ok) {
      console.warn(`[SEO Auditor] fetchImageAsBase64 HTTP error ${res.status} for URL: ${resolvedUrl}`);
      return null;
    }
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer).toString("base64");
  } catch (error) {
    console.error("[SEO Auditor] fetchImageAsBase64 error for URL:", imageUrl, error);
    return null;
  }
}

export async function auditSEO({ url, html }: SEOCheckInput): Promise<SEOResult> {
  const title = parseTitle(html);
  const titleLength = title?.length ?? 0;
  const titleOk = titleLength >= 30 && titleLength <= 65;

  const description = parseMetaTag(html, "name", "description");
  const descriptionLength = description?.length ?? 0;
  const descriptionOk = descriptionLength >= 50 && descriptionLength <= 165;

  const ogTitle = parseMetaTag(html, "property", "og:title");
  const ogDescription = parseMetaTag(html, "property", "og:description");
  const ogImage = parseMetaTag(html, "property", "og:image");
  const ogImageBase64 = ogImage ? await fetchImageAsBase64(ogImage, url) : null;

  const h1Count = countH1(html);
  const h1Ok = h1Count === 1;

  const imagesWithoutAlt = countImagesWithoutAlt(html);
  const canonicalUrl = parseCanonical(html);
  const structuredDataCount = countStructuredData(html);

  const { exists: robotsTxtExists, content: robotsTxtContent } = await fetchRobotsTxt(url);
  const sitemapExists = await checkSitemap(url, robotsTxtContent);

  const issues: Issue[] = [];

  if (!title) {
    issues.push({
      id: nanoid(), severity: "critical",
      title: "Missing <title> Tag",
      testScenario: "Verify HTML head structure for page title definition.",
      testStep: "1. Retrieve target URL HTML page source. 2. Verify existence of <title> element inside <head>.",
      description: "The page lacks a <title> element inside the HTML head node.",
      whyItMatters: "The title tag is the single most important on-page SEO element. Search crawlers use it as the primary title in SERPs, and its absence prevents optimal search visibility.",
      recommendation: "Add a unique, descriptive <title> tag between 30–65 characters.",
    });
  } else if (!titleOk) {
    issues.push({
      id: nanoid(), severity: "medium",
      title: `Title Length Issue (${titleLength} chars)`,
      testScenario: "Validate <title> character length limits for Search compliance.",
      testStep: "1. Retrieve target URL HTML page source. 2. Extract <title> node content. 3. Count character length.",
      description: `Title is ${titleLength < 30 ? "too short" : "too long"} (${titleLength} chars): "${title}"`,
      whyItMatters: "Titles outside the 30-65 character range are either truncated in search results (diluting CTR) or lack sufficient keyword value.",
      recommendation: "Keep the title between 30–65 characters for optimal SERP display.",
    });
  }

  if (!description) {
    issues.push({
      id: nanoid(), severity: "high",
      title: "Missing Meta Description",
      testScenario: "Verify HTML header metadata structure for meta description availability.",
      testStep: "1. Retrieve target HTML source. 2. Verify existence of <meta name='description'>.",
      description: "No meta description attribute found in the document header.",
      whyItMatters: "Meta descriptions summarize page content. Without it, search engines auto-generate snippet text from random page copy, which can look highly unprofessional.",
      recommendation: "Add a unique meta description between 50–165 characters.",
    });
  } else if (!descriptionOk) {
    issues.push({
      id: nanoid(), severity: "low",
      title: `Meta Description Length Issue (${descriptionLength} chars)`,
      testScenario: "Validate meta description length bounds for search display truncation.",
      testStep: "1. Retrieve page HTML source. 2. Locate description meta tag. 3. Verify content character count.",
      description: `Meta description length is ${descriptionLength < 50 ? "too short" : "too long"} (${descriptionLength} chars).`,
      whyItMatters: "Descriptions that are too short fail to engage search users, while descriptions exceeding 165 characters are truncated with an ellipsis (...).",
      recommendation: "Keep meta description between 50–165 characters.",
    });
  }

  const isBlankOgImage = !ogImage || 
    ogImage.trim() === "" || 
    /blank|placeholder|empty|pixel|logo|default/i.test(ogImage);

  if (isBlankOgImage) {
    issues.push({
      id: nanoid(),
      severity: "high",
      title: "Open Graph Thumbnail Verification: FAILED",
      testScenario: "Verify social media card thumbnail representation for brand sharing accuracy.",
      testStep: "1. Inspect HTML head properties. 2. Identify og:image meta tag value. 3. Verify image is not a default placeholder.",
      description: `The Open Graph image tag (og:image) is either missing, empty, or configured with a generic placeholder URL ("${ogImage || "empty"}").`,
      whyItMatters: "When the page is shared on platforms like Slack, LinkedIn, or Facebook, a blank or placeholder image hurts click-through conversions and looks amateurish to users.",
      recommendation: "Replace the blank/generic placeholder og:image with the specific absolute URL of the primary product image."
    });
  }

  const missingOgTags = [
    !ogTitle && "og:title",
    !ogDescription && "og:description",
  ].filter(Boolean);

  if (missingOgTags.length > 0) {
    issues.push({
      id: nanoid(),
      severity: "medium",
      title: "Incomplete Open Graph Tags",
      testScenario: "Audit Open Graph metadata attributes for complete social profiles.",
      testStep: "1. Retrieve page source. 2. Verify existence of og:title and og:description properties.",
      description: `Missing essential social sharing tags: ${missingOgTags.join(", ")}`,
      whyItMatters: "Social platforms rely on these tags to build rich sharing previews. Incomplete tags result in fallback titles or lack of descriptive context.",
      recommendation: "Add standard og:title and og:description meta tags for rich social media cards."
    });
  }

  if (h1Count === 0) {
    issues.push({
      id: nanoid(), severity: "high",
      title: "No H1 Heading Found",
      testScenario: "Validate H1 heading presence for primary topic declaration.",
      testStep: "1. Retrieve page source. 2. Count occurrences of <h1> tags in body markup.",
      description: "The page does not contain any H1 heading element.",
      whyItMatters: "The H1 heading is a core signal indicating the page's main theme. Lack of an H1 hinders keyword prioritization for search crawlers and limits visual layout hierarchy.",
      recommendation: "Add exactly one H1 heading that reflects the page's primary topic.",
    });
  } else if (h1Count > 1) {
    issues.push({
      id: nanoid(), severity: "medium",
      title: `Multiple H1 Tags (${h1Count})`,
      testScenario: "Validate H1 uniqueness constraint to prevent keyword dilution.",
      testStep: "1. Parse document body markup. 2. Count occurrences of <h1> elements.",
      description: `Multiple (${h1Count}) H1 heading tags detected on a single page.`,
      whyItMatters: "Using multiple H1 tags dilutes keyword weight and confuses search crawlers regarding the primary subject matter.",
      recommendation: "Use only one H1 per page, converting other secondary headings to H2 or H3.",
    });
  }

  if (imagesWithoutAlt > 0) {
    issues.push({
      id: nanoid(), severity: "medium",
      title: `${imagesWithoutAlt} Image(s) Missing Alt Text`,
      testScenario: "Verify image tags contain alt attributes for accessibility and SEO.",
      testStep: "1. Parse page markup. 2. Find all <img> tags. 3. Check for empty or missing 'alt' attributes.",
      description: `Detected ${imagesWithoutAlt} image element(s) lacking descriptive alternative alt text.`,
      whyItMatters: "Alt text is crucial for visually impaired users relying on screen readers and allows search engines to index and rank the images correctly in image search.",
      recommendation: 'Add descriptive alt="" attributes to all images.',
    });
  }

  if (!robotsTxtExists) {
    issues.push({
      id: nanoid(), severity: "low",
      title: "robots.txt Not Found",
      testScenario: "Verify robots.txt configuration file presence in domain root.",
      testStep: "1. Perform GET request to /robots.txt at domain root. 2. Validate HTTP response status.",
      description: "No robots.txt file was found at the root of the domain.",
      whyItMatters: "A robots.txt file guides search bots regarding which pages to crawl or avoid, preventing server overloading and indexing of private/dev routes.",
      recommendation: "Add a robots.txt file to control crawler access.",
    });
  }

  if (!sitemapExists) {
    issues.push({
      id: nanoid(), severity: "low",
      title: "XML Sitemap Not Found",
      testScenario: "Detect XML Sitemap availability for automated content discovery.",
      testStep: "1. Parse robots.txt for Sitemap declaration. 2. Attempt head requests on common paths (/sitemap.xml).",
      description: "No XML sitemap could be found or resolved.",
      whyItMatters: "Sitemaps give search bots an active map of all site paths, ensuring new and deep-linked pages are quickly discovered and crawled.",
      recommendation: "Create and submit an XML sitemap to Google Search Console.",
    });
  }

  // Calculate score (start at 100, deduct for issues)
  const deductions: Record<string, number> = {
    critical: 25, high: 15, medium: 8, low: 3,
  };
  let score = 100;
  for (const issue of issues) {
    score -= deductions[issue.severity] ?? 0;
  }
  score = Math.max(0, score);

  return {
    title,
    titleLength,
    titleOk,
    description,
    descriptionLength,
    descriptionOk,
    ogTitle,
    ogDescription,
    ogImage,
    ogImageBase64,
    h1Count,
    h1Ok,
    imagesWithoutAlt,
    robotsTxtExists,
    robotsTxtContent,
    sitemapExists,
    canonicalUrl,
    structuredDataCount,
    issues,
    score,
  };
}
