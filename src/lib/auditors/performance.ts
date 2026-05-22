import type { Issue } from "../types";
import { nanoid } from "../utils";

export interface NetworkRequest {
  url: string;
  startTime: number;
  endTime: number;
  duration: number;
  transferSize: number;
  resourceSize: number;
  mimeType: string;
  statusCode: number;
}

export interface PageSpeedResult {
  score: number;
  fcp: string; // First Contentful Paint
  lcp: string; // Largest Contentful Paint
  cls: string; // Cumulative Layout Shift
  speedIndex: string;
  screenshot?: string; // Base64 or Data URI
  waterfall?: NetworkRequest[];
}

export interface GTmetrixResult {
  grade: string;
  performanceScore: number;
  structureScore: number;
}

export interface PerformanceResult {
  mobile: PageSpeedResult | null;
  desktop: PageSpeedResult | null;
  gtmetrix: GTmetrixResult | null;
  issues: Issue[];
}

async function fetchPageSpeed(url: string, strategy: "mobile" | "desktop"): Promise<PageSpeedResult | null> {
  try {
    const apiKey = process.env.PAGESPEED_API_KEY;
    const urlParams = new URLSearchParams({ url, strategy, category: "performance" });
    if (apiKey && apiKey !== "your_pagespeed_api_key_here") {
      urlParams.append("key", apiKey);
    }
    
    // Official Google PageSpeed Insights REST API
    const res = await fetch(`https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${urlParams.toString()}`, {
      signal: AbortSignal.timeout(60000), // PageSpeed can be slow, increase to 60s
    });
    if (!res.ok) return null;
    const data = await res.json();

    const lighthouse = data.lighthouseResult;
    if (!lighthouse) return null;

    const audits = lighthouse.audits;
    
    // Extract screenshot
    let screenshot: string | undefined = undefined;
    const finalScreenshot = audits["final-screenshot"]?.details?.data;
    if (typeof finalScreenshot === "string") {
      screenshot = finalScreenshot;
    } else {
      const fullPageScreenshot = audits["full-page-screenshot"]?.details?.screenshot?.data;
      if (typeof fullPageScreenshot === "string") {
        screenshot = fullPageScreenshot;
      }
    }

    // Extract network requests for waterfall model
    const waterfall: NetworkRequest[] = [];
    const nwAudits = audits["network-requests"];
    if (nwAudits && nwAudits.details && nwAudits.details.items) {
      for (const item of nwAudits.details.items) {
        waterfall.push({
          url: item.url || "",
          startTime: typeof item.startTime === "number" ? item.startTime : 0,
          endTime: typeof item.endTime === "number" ? item.endTime : 0,
          duration: typeof item.duration === "number" ? item.duration : 0,
          transferSize: typeof item.transferSize === "number" ? item.transferSize : 0,
          resourceSize: typeof item.resourceSize === "number" ? item.resourceSize : 0,
          mimeType: item.mimeType || "",
          statusCode: typeof item.statusCode === "number" ? item.statusCode : 200,
        });
      }
    }

    return {
      score: Math.round((lighthouse.categories.performance?.score ?? 0) * 100),
      fcp: audits["first-contentful-paint"]?.displayValue ?? "N/A",
      lcp: audits["largest-contentful-paint"]?.displayValue ?? "N/A",
      cls: audits["cumulative-layout-shift"]?.displayValue ?? "N/A",
      speedIndex: audits["speed-index"]?.displayValue ?? "N/A",
      screenshot,
      waterfall: waterfall.sort((a, b) => a.startTime - b.startTime).slice(0, 15),
    };
  } catch (error) {
    console.error(`PageSpeed API error (${strategy}):`, error);
    return null;
  }
}

async function fetchGTmetrix(url: string): Promise<GTmetrixResult | null> {
  const apiKey = process.env.GTMETRIX_API_KEY;
  if (!apiKey || apiKey === "your_gtmetrix_api_key_here") {
    return null; // Not configured
  }

  try {
    const authHeader = "Basic " + Buffer.from(`${apiKey}:`).toString("base64");
    
    // Start test
    const startRes = await fetch("https://gtmetrix.com/api/2.0/tests", {
      method: "POST",
      headers: {
        "Authorization": authHeader,
        "Content-Type": "application/vnd.api+json"
      },
      body: JSON.stringify({
        data: { type: "test", attributes: { url } }
      })
    });
    
    if (!startRes.ok) return null;
    const startData = await startRes.json();
    const testId = startData.data.id;

    // Poll for results (max 10 tries, every 5 seconds = 50s max)
    for (let i = 0; i < 10; i++) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      const pollRes = await fetch(`https://gtmetrix.com/api/2.0/tests/${testId}`, {
        headers: { "Authorization": authHeader }
      });
      if (!pollRes.ok) continue;
      
      const pollData = await pollRes.json();
      const state = pollData.data.attributes.state;
      
      if (state === "completed") {
        const reportId = pollData.data.relationships.report.data.id;
        // Fetch report
        const reportRes = await fetch(`https://gtmetrix.com/api/2.0/reports/${reportId}`, {
          headers: { "Authorization": authHeader }
        });
        if (!reportRes.ok) return null;
        const reportData = await reportRes.json();
        const attrs = reportData.data.attributes;
        
        return {
          grade: attrs.gtmetrix_grade,
          performanceScore: attrs.performance_score,
          structureScore: attrs.structure_score
        };
      } else if (state === "error") {
        return null;
      }
    }
    
    return null; // Timed out waiting
  } catch (err) {
    console.error("GTmetrix API error:", err);
    return null;
  }
}

export async function auditPerformance(url: string): Promise<PerformanceResult> {
  const [mobile, desktop, gtmetrix] = await Promise.all([
    fetchPageSpeed(url, "mobile"),
    fetchPageSpeed(url, "desktop"),
    fetchGTmetrix(url)
  ]);

  const issues: Issue[] = [];

  if (mobile && mobile.score < 50) {
    issues.push({
      id: nanoid(),
      severity: "high",
      title: "Poor Mobile Performance",
      testScenario: "Verify mobile load speeds and core web vitals performance metrics.",
      testStep: "1. Request mobile viewport profiling. 2. Fetch Lighthouse metrics. 3. Verify that the mobile performance score exceeds 50/100 and Largest Contentful Paint (LCP) is under 2.5s.",
      description: `PageSpeed Insights reported a critical mobile performance score of ${mobile.score}/100. Largest Contentful Paint (LCP) is delayed at ${mobile.lcp}.`,
      whyItMatters: "Poor mobile speed increases mobile bounce rate by up to 123% on slow connections and degrades search engine mobile-first indexing rankings.",
      recommendation: "Optimize mobile images, reduce render-blocking resources, and defer offscreen JS."
    });
  } else if (mobile && mobile.score < 80) {
    issues.push({
      id: nanoid(),
      severity: "medium",
      title: "Average Mobile Performance",
      testScenario: "Validate mobile viewport core web vitals optimization compliance.",
      testStep: "1. Initiate mobile profile test. 2. Verify mobile performance score is 80/100 or higher.",
      description: `Mobile performance score is suboptimal at ${mobile.score}/100.`,
      whyItMatters: "Average speeds result in minor page load lag on slower 4G networks, causing friction and small drops in user session retention.",
      recommendation: "Review PageSpeed Insights recommendations to improve mobile load speeds."
    });
  }

  if (desktop && desktop.score < 50) {
    issues.push({
      id: nanoid(),
      severity: "high",
      title: "Poor Desktop Performance",
      testScenario: "Validate desktop browser loading speed and Core Web Vitals compliance.",
      testStep: "1. Run desktop profile test. 2. Verify desktop performance score is 80/100 or higher and LCP is under 2.5s.",
      description: `PageSpeed Insights reported a desktop performance score of ${desktop.score}/100. LCP is ${desktop.lcp}.`,
      whyItMatters: "Slow desktop loading times negatively affect user engagement, increase cart abandonment, and lead to poor page experience scores.",
      recommendation: "Optimize desktop assets and review server response times."
    });
  }

  return {
    mobile,
    desktop,
    gtmetrix,
    issues
  };
}
