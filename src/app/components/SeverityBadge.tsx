// src/app/components/SeverityBadge.tsx
"use client";

import type { Severity } from "@/lib/types";

const SEVERITY_CONFIG: Record<
  Severity,
  { label: string; bg: string; text: string; ring: string }
> = {
  critical: {
    label: "Critical",
    bg: "bg-red-500/10",
    text: "text-red-400",
    ring: "ring-red-500/30",
  },
  high: {
    label: "High",
    bg: "bg-orange-500/10",
    text: "text-orange-400",
    ring: "ring-orange-500/30",
  },
  medium: {
    label: "Medium",
    bg: "bg-yellow-500/10",
    text: "text-yellow-400",
    ring: "ring-yellow-500/30",
  },
  low: {
    label: "Low",
    bg: "bg-blue-500/10",
    text: "text-blue-400",
    ring: "ring-blue-500/30",
  },
  pass: {
    label: "Pass",
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    ring: "ring-emerald-500/30",
  },
};

interface Props {
  severity: Severity;
  size?: "sm" | "md";
}

export function SeverityBadge({ severity, size = "sm" }: Props) {
  const config = SEVERITY_CONFIG[severity];
  const sizeClass = size === "sm" ? "text-[10px] px-2 py-0.5" : "text-xs px-2.5 py-1";

  return (
    <span
      className={`inline-flex items-center rounded-full font-semibold tracking-wide ring-1 ${config.bg} ${config.text} ${config.ring} ${sizeClass}`}
    >
      {config.label}
    </span>
  );
}
