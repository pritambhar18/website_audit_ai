// src/app/api/report/route.ts
// PDF generation endpoint.
// GET /api/report?sessionId=<id>
// Reads the stored audit JSON, generates and streams the PDF.

import { type NextRequest } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { generateReport } from "@/lib/pdf/generator";
import type { AuditResult } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get("sessionId");

  if (!sessionId || !/^[a-f0-9]{16}$/.test(sessionId)) {
    return new Response(
      JSON.stringify({ error: "Invalid or missing sessionId" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const filePath = join(tmpdir(), `${sessionId}.json`);

  let auditData: AuditResult;

  try {
    const raw = await readFile(filePath, "utf-8");
    auditData = JSON.parse(raw) as AuditResult;
  } catch {
    return new Response(
      JSON.stringify({ error: "Audit session not found. Please run the audit again." }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const pdfBuffer = await generateReport(auditData);
    const domain = new URL(auditData.url).hostname.replace(/\./g, "-");
    const date = new Date(auditData.auditedAt).toISOString().split("T")[0];
    const filename = `audit-${domain}-${date}.pdf`;

    return new Response(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": pdfBuffer.length.toString(),
        "Cache-Control": "no-store",
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[report] PDF generation failed:", err);
    return new Response(
      JSON.stringify({ error: `PDF generation failed: ${message}` }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
