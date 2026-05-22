// src/lib/utils.ts
// Shared utility functions

import { randomBytes } from "crypto";

/** Generate a short random ID */
export function nanoid(size = 8): string {
  return randomBytes(size).toString("hex").slice(0, size);
}

/** Clamp a number between min and max */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** Format bytes to human-readable string */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Calculate overall audit score from component scores */
export function calculateOverallScore(scores: number[]): number {
  if (scores.length === 0) return 0;
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

/** Count issues by severity — returns keys that match AuditResult fields */
export function countBySeverity(issues: Array<{ severity: string }>): {
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
} {
  return {
    criticalCount: issues.filter((i) => i.severity === "critical").length,
    highCount: issues.filter((i) => i.severity === "high").length,
    mediumCount: issues.filter((i) => i.severity === "medium").length,
    lowCount: issues.filter((i) => i.severity === "low").length,
  };
}

/** Sleep for a given number of milliseconds */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
