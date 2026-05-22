// src/lib/auditors/ai.ts
// Google Gemini Vision integration for screenshot analysis.
// Returns structured issues and recommendations for UI/UX problems.

import type { Issue, Severity } from "../types";
import { nanoid } from "../utils";

interface AnalysisContext {
  category: "mobile" | "tablet" | "desktop";
  width: number;
  height: number;
  url?: string;
}

interface AIIssue {
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  description: string;
  recommendation: string;
}

interface AIResponse {
  issues: AIIssue[];
  overallRating: number;
  summary: string;
}

/**
 * Analyzes a screenshot using Google Gemini Vision and returns structured issues.
 * Fails gracefully if no API key is configured.
 */
export async function analyzeScreenshot(
  screenshotBase64: string,
  deviceName: string,
  context: AnalysisContext
): Promise<Issue[]> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === "your_gemini_api_key_here") {
    return []; // AI disabled — no key provided
  }

  try {
    const { GoogleGenAI } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey });

    const prompt = `You are an expert UI/UX and web QA auditor. Analyze this screenshot taken on ${deviceName} (${context.width}×${context.height}px, ${context.category} device).

Check for these specific UI/UX and visual layout issues based on the device category:

ALL DEVICES (Mobile, Tablet, Desktop):
- OVERLAPPING ISSUES: Ensure no text blocks, images, buttons, or structural containers overlap incorrectly or block readability. Pay close attention to overlapping labels, text bleeding outside its bounds, and overlapping interactive elements that make clicking difficult.
- PADDING & SPACING ISSUES: Check if buttons, input fields, forms, and core content containers have proper, professional padding and spacing. The padding must look balanced and visually appealing in both Landscape and Portrait orientations (e.g., elements should not look cramped or flush against edges).
- IMAGE SLIDERS / CAROUSELS: If any image slider, carousel, or banner exists on the page, verify that the slides and images are shown properly, fully inside the viewport, without being distorted, squished, stretched, or cut off.
- Navigation menus and headers must render correctly without visual corruption.
- Buttons or links should have appropriate touch targets (especially on mobile/tablet).

Assign priority appropriately:
- 'critical' (P1) for completely broken layouts, overlapping content that makes the form/button completely unclickable or unreadable, or sliders rendering completely black/broken.
- 'high' (P2) for major padding anomalies (e.g., forms/buttons having zero padding or touching screen edges), clear image slider distortions, or text cut-offs.
- 'medium' (P3) for minor alignment issues or unbalanced spacing.
- 'low' (P4) for cosmetic visual suggestions.

Respond ONLY with valid JSON matching this schema:
{
  "issues": [
    {
      "severity": "critical|high|medium|low",
      "title": "Short issue title",
      "testScenario": "Simple, non-technical QA scenario name (e.g., 'Checking if layout is broken on mobile screens' or 'Visual menu check')",
      "testStep": "Step-by-step test instructions written in extremely simple, non-technical plain English (e.g., '1. Look at the top navigation menu. 2. Observe that the menu button is sitting on top of the logo text. 3. Try to click it.'). Keep it entirely free of technical jargon so any manager or user can easily verify it.",
      "description": "Clear and simple description of what is visually wrong, where it is located, and how it looks, so any business person immediately understands it.",
      "whyItMatters": "Explain the user and business impact simply (e.g., 'If the menu covers the logo, users cannot navigate the site easily, making it look unprofessional.')",
      "recommendation": "Simple, actionable instruction on how to fix it"
    }
  ],
  "overallRating": 85,
  "summary": "One sentence overall assessment"
}

If no issues are found, return { "issues": [], "overallRating": 100, "summary": "No issues detected." }`;

    // Retry logic for rate limit (429) errors with exponential backoff
    let response;
    const maxRetries = 3;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        response = await ai.models.generateContent({
          model: "gemini-2.0-flash",
          contents: [
            prompt,
            {
              inlineData: {
                data: screenshotBase64,
                mimeType: "image/jpeg"
              }
            }
          ],
          config: {
            responseMimeType: "application/json",
          }
        });
        break; // Success — exit retry loop
      } catch (retryErr: any) {
        const isRateLimit = retryErr?.status === 429 || retryErr?.message?.includes("429") || retryErr?.message?.includes("RESOURCE_EXHAUSTED");
        if (isRateLimit && attempt < maxRetries) {
          const waitSec = Math.pow(2, attempt + 1) * 5; // 10s, 20s, 40s
          console.warn(`[AI] Rate limited (429). Retrying in ${waitSec}s... (attempt ${attempt + 1}/${maxRetries})`);
          await new Promise(r => setTimeout(r, waitSec * 1000));
        } else {
          throw retryErr;
        }
      }
    }
    if (!response) return [];

    const content = response.text ?? "{}";

    const parsed: AIResponse = JSON.parse(content);

    const issues: Issue[] = (parsed.issues ?? []).map((issue: { severity: Severity; title: string; description: string; recommendation: string; testScenario?: string; testStep?: string; whyItMatters?: string }) => ({
      id: nanoid(),
      severity: issue.severity ?? "medium",
      title: issue.title,
      description: issue.description,
      recommendation: issue.recommendation,
      testScenario: issue.testScenario,
      testStep: issue.testStep,
      whyItMatters: issue.whyItMatters,
      device: deviceName,
      url: context.url,
    }));

    return issues;
  } catch (err) {
    console.error("[AI] analyzeScreenshot failed:", err);
    return [];
  }
}
