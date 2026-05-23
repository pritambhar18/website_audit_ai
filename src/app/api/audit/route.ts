// src/app/api/audit/route.ts
// Streaming SSE audit endpoint.
// GET /api/audit?url=https://example.com
// Emits Server-Sent Events as the audit progresses, storing results in /tmp.

import { type NextRequest } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { getBrowser } from "@/lib/browser";
import { auditLinks } from "@/lib/auditors/links";
import { auditResponsive } from "@/lib/auditors/responsive";
import { auditSEO } from "@/lib/auditors/seo";
import { auditSecurity } from "@/lib/auditors/security";
import { auditForms } from "@/lib/auditors/forms";
import { auditPerformance } from "@/lib/auditors/performance";
import { calculateOverallScore, countBySeverity, nanoid } from "@/lib/utils";
import type { AuditResult, ProgressEvent } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// ─── SSE Helpers ──────────────────────────────────────────────────────────────

function encodeSSE(event: ProgressEvent): Uint8Array {
  const data = JSON.stringify(event);
  return new TextEncoder().encode(`data: ${data}\n\n`);
}

// ─── URL Validation ───────────────────────────────────────────────────────────

function validateUrl(raw: string | null): { url: string; error?: string } {
  if (!raw) return { url: "", error: "URL parameter is required." };

  let url = raw.trim();
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = `https://${url}`;
  }

  try {
    new URL(url);
    return { url };
  } catch {
    return { url: "", error: "Invalid URL format." };
  }
}

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const rawUrl = request.nextUrl.searchParams.get("url");
  const { url, error: urlError } = validateUrl(rawUrl);
  const runAI = request.nextUrl.searchParams.get("ai") !== "false";

  if (urlError) {
    const errEvent: ProgressEvent = {
      step: "error",
      stepIndex: 0,
      totalSteps: 8,
      progress: 0,
      message: urlError,
      error: urlError,
      done: true,
    };
    return new Response(`data: ${JSON.stringify(errEvent)}\n\n`, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  }

  const sessionId = nanoid(16);
  const startTime = Date.now();

  const stream = new ReadableStream({
    async start(controller) {
      const emit = (event: ProgressEvent) => {
        try {
          controller.enqueue(encodeSSE(event));
        } catch {
          // Client disconnected
        }
      };

      const steps = [
        "Link Validation",
        "Desktop Screenshots",
        "Mobile Screenshots",
        "Tablet Screenshots",
        "SEO Analysis",
        "Security & Headers",
        "Form Analysis",
        "Performance Insights",
        "Generating PDF Data",
      ];
      const totalSteps = steps.length;

      try {
        // ── Step 1: Initialize browser ──
        emit({
          step: "init",
          stepIndex: 0,
          totalSteps,
          progress: 2,
          message: "Launching browser...",
        });

        const browser = await getBrowser();

        // Open initial page for link checking
        const initContext = await browser.newContext({
          viewport: { width: 1280, height: 800 },
          ignoreHTTPSErrors: true,
        });
        const initPage = await initContext.newPage();
        
        try {
          await initPage.goto(url, { waitUntil: "networkidle", timeout: 30_000 });
        } catch {
          await initPage.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
        }

        const html = await initPage.content();

        // Start the slow Google PageSpeed / Performance audit in the background concurrently
        const performancePromise = auditPerformance(url);

        // ── Step 2: Link Validation ──
        emit({
          step: steps[0],
          stepIndex: 1,
          totalSteps,
          progress: 5,
          message: "Validating all page links...",
        });

        const links = await auditLinks(initPage, url);

        emit({
          step: steps[0],
          stepIndex: 1,
          totalSteps,
          progress: 15,
          message: `Found ${links.total} links — ${links.broken} broken`,
          data: { total: links.total, broken: links.broken },
        });

        await initContext.close();

        // ── Step 3-5: Responsive Screenshots ──
        emit({
          step: steps[1],
          stepIndex: 2,
          totalSteps,
          progress: 18,
          message: "Capturing desktop screenshots...",
        });

        const responsive = await auditResponsive(
          browser,
          url,
          runAI,
          (device, index, total) => {
            const baseProgress = 18;
            const maxProgress = 65;
            const deviceProgress = baseProgress + Math.round((index / total) * (maxProgress - baseProgress));

            const stepLabel =
              device.category === "desktop"
                ? steps[1]
                : device.category === "mobile"
                ? steps[2]
                : steps[3];

            const stepIndex =
              device.category === "desktop" ? 2 : device.category === "mobile" ? 3 : 4;

            emit({
              step: stepLabel,
              stepIndex,
              totalSteps,
              progress: deviceProgress,
              message: `Capturing ${device.name}...`,
            });
          }
        );

        emit({
          step: "Screenshots",
          stepIndex: 4,
          totalSteps,
          progress: 65,
          message: `Captured ${responsive.devices.length} device screenshots`,
          data: { deviceCount: responsive.devices.length },
        });

        // ── Step 6: SEO ──
        emit({
          step: steps[4],
          stepIndex: 5,
          totalSteps,
          progress: 70,
          message: "Analyzing SEO metadata...",
        });

        const seo = await auditSEO({ url, html });

        emit({
          step: steps[4],
          stepIndex: 5,
          totalSteps,
          progress: 78,
          message: `SEO score: ${seo.score}/100`,
          data: { score: seo.score },
        });

        // ── Step 7: Security ──
        emit({
          step: steps[5],
          stepIndex: 6,
          totalSteps,
          progress: 80,
          message: "Checking security headers and SSL...",
        });

        const security = await auditSecurity(url, html, browser);

        emit({
          step: steps[5],
          stepIndex: 6,
          totalSteps,
          progress: 88,
          message: `Security score: ${security.score}/100`,
          data: { score: security.score },
        });

        // ── Step 8: Forms ──
        emit({
          step: steps[6],
          stepIndex: 7,
          totalSteps,
          progress: 90,
          message: "Analyzing forms...",
        });

        const forms = await auditForms(html, runAI);

        // ── Step 9: Performance ──
        emit({
          step: steps[7],
          stepIndex: 8,
          totalSteps,
          progress: 92,
          message: "Fetching Google PageSpeed Insights...",
        });

        const performance = await performancePromise;

        // ── Step 10: Compile results ──
        emit({
          step: steps[8],
          stepIndex: 9,
          totalSteps,
          progress: 96,
          message: "Compiling audit results...",
        });

        const durationMs = Date.now() - startTime;
        const allIssues = [
          ...links.issues,
          ...responsive.issues,
          ...seo.issues,
          ...security.issues,
          ...forms.issues,
          ...performance.issues,
        ];

        const overallScore = calculateOverallScore([
          seo.score,
          security.score,
          // Convert broken links ratio to score (0 broken = 100)
          links.total > 0 ? Math.max(0, 100 - (links.broken / links.total) * 500) : 100,
          performance.mobile?.score ?? 100,
          performance.desktop?.score ?? 100,
        ]);

        const severityCounts = countBySeverity(allIssues);

        const auditResult: AuditResult = {
          sessionId,
          url,
          auditedAt: new Date().toISOString(),
          durationMs,
          links,
          responsive,
          seo,
          security,
          forms,
          performance,
          overallScore,
          totalIssues: allIssues.length,
          ...severityCounts,
        };

        // Store in OS temp directory (works on Vercel)
        const tmpDir = tmpdir();
        await writeFile(
          join(tmpDir, `${sessionId}.json`),
          JSON.stringify(auditResult),
          "utf-8"
        );

        emit({
          step: "complete",
          stepIndex: totalSteps,
          totalSteps,
          progress: 100,
          message: "Audit complete! Generating your report...",
          data: {
            sessionId,
            overallScore,
            totalIssues: allIssues.length,
            ...severityCounts,
          },
          done: true,
          sessionId,
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("[audit] Error:", err);
        emit({
          step: "error",
          stepIndex: 0,
          totalSteps,
          progress: 0,
          message: `Audit failed: ${message}`,
          error: message,
          done: true,
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
