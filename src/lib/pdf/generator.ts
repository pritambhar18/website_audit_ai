// src/lib/pdf/generator.ts
// PDF generation — renders the AuditReportDocument to a Buffer.

import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import type { AuditResult } from "../types";
import { AuditReportDocument } from "./template";

/**
 * Generates a PDF report from audit data and returns it as a Buffer.
 */
export async function generateReport(data: AuditResult): Promise<Buffer> {
  // Cast is needed because renderToBuffer expects ReactElement<DocumentProps>
  // but React.createElement returns JSX.Element which is assignable at runtime.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const element = React.createElement(AuditReportDocument, { data }) as any;
  const buffer = await renderToBuffer(element);
  return Buffer.from(buffer);
}
