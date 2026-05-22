// src/app/components/IssueCard.tsx
"use client";

import { SeverityBadge } from "./SeverityBadge";
import type { Issue } from "@/lib/types";

const PRIORITY_LABEL: Record<string, string> = {
  critical: "P1 · Immediate Action",
  high:     "P2 · Fix Soon",
  medium:   "P3 · Schedule Fix",
  low:      "P4 · Low Priority",
};

const PRIORITY_STYLE: Record<string, string> = {
  critical: "bg-red-900/50 text-red-300 ring-red-500/30",
  high:     "bg-orange-900/50 text-orange-300 ring-orange-500/30",
  medium:   "bg-yellow-900/50 text-yellow-300 ring-yellow-500/30",
  low:      "bg-blue-900/50 text-blue-300 ring-blue-500/30",
};

const BORDER: Record<string, string> = {
  critical: "border-red-500/50",
  high:     "border-orange-500/50",
  medium:   "border-yellow-500/50",
  low:      "border-blue-500/50",
  pass:     "border-emerald-500/50",
};

interface Props { issue: Issue; }

export function IssueCard({ issue }: Props) {
  const priority = PRIORITY_LABEL[issue.severity];
  const priorityStyle = PRIORITY_STYLE[issue.severity];

  return (
    <div className={`rounded-xl border-l-4 bg-white/5 backdrop-blur-sm p-4 space-y-2 transition-all hover:bg-white/10 ${BORDER[issue.severity] ?? "border-gray-500/50"}`}>

      {/* Row 1: severity + priority + device + title */}
      <div className="flex items-start gap-2 flex-wrap">
        <SeverityBadge severity={issue.severity} />
        {priority && (
          <span className={`text-[10px] font-semibold rounded-full px-2 py-0.5 ring-1 ${priorityStyle}`}>
            {priority}
          </span>
        )}
        {issue.device && (
          <span className="text-[10px] bg-indigo-500/10 text-indigo-400 ring-1 ring-indigo-500/30 px-2 py-0.5 rounded-full font-medium">
            {issue.device}
          </span>
        )}
        <span className="text-sm font-semibold text-white/90 flex-1">{issue.title}</span>
      </div>

      {/* Row 2: Test Details (Scenario/Step) */}
      {(issue.testScenario || issue.testStep) && (
        <div className="bg-white/5 rounded-lg p-2.5 space-y-2 border border-white/5">
          {issue.testScenario && (
            <div className="text-[10px] text-white/40 leading-tight">
              <span className="font-bold text-white/60 uppercase tracking-tighter mr-1">Test Scenario:</span>
              {issue.testScenario}
            </div>
          )}
          {issue.testStep && (
            <div className="text-[10px] text-white/40 leading-tight">
              <span className="font-bold text-white/60 uppercase tracking-tighter mr-1">Test Step:</span>
              {issue.testStep}
            </div>
          )}
        </div>
      )}

      {/* Row 3: description */}
      <div className="space-y-1">
        <p className="text-sm text-white/70 leading-relaxed">{issue.description}</p>
        {issue.whyItMatters && (
          <p className="text-xs text-white/40 italic">
            <span className="font-bold not-italic text-white/50">Impact:</span> {issue.whyItMatters}
          </p>
        )}
      </div>

      {/* Row 4: fix recommendation */}
      <div className="flex items-start gap-2 bg-indigo-500/5 rounded-lg p-2 border border-indigo-500/10">
        <span className="text-indigo-400 text-xs mt-0.5">→</span>
        <p className="text-xs text-indigo-300 leading-relaxed">
          <span className="font-bold text-indigo-200">Fix Recommendation:</span> {issue.recommendation}
        </p>
      </div>

      {/* Row 4: affected URL */}
      {issue.url && (
        <p className="text-xs text-white/30 font-mono truncate">🔗 {issue.url}</p>
      )}
    </div>
  );
}
