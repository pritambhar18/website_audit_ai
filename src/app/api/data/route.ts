// src/app/api/data/route.ts
// Returns the raw audit JSON for a given sessionId.
// Used by the frontend to populate the results dashboard.

import { type NextRequest } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import type { AuditResult } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get("sessionId");

  if (!sessionId || !/^[a-f0-9]{16}$/.test(sessionId)) {
    return Response.json({ error: "Invalid sessionId" }, { status: 400 });
  }

  const filePath = join(process.cwd(), "tmp", `${sessionId}.json`);

  try {
    const raw = await readFile(filePath, "utf-8");
    const data: AuditResult = JSON.parse(raw);
    return Response.json(data);
  } catch {
    return Response.json(
      { error: "Session not found" },
      { status: 404 }
    );
  }
}
