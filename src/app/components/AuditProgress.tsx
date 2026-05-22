// src/app/components/AuditProgress.tsx
"use client";

import type { ProgressEvent } from "@/lib/types";

const STEPS = [
  { key: "init", icon: "🚀", label: "Initializing" },
  { key: "Link Validation", icon: "🔗", label: "Link Validation" },
  { key: "Desktop Screenshots", icon: "🖥️", label: "Desktop Screenshots" },
  { key: "Mobile Screenshots", icon: "📱", label: "Mobile Screenshots" },
  { key: "Tablet Screenshots", icon: "📟", label: "Tablet Screenshots" },
  { key: "SEO Analysis", icon: "🔍", label: "SEO Analysis" },
  { key: "Security & Headers", icon: "🔒", label: "Security & Headers" },
  { key: "Form Analysis", icon: "📋", label: "Form Analysis" },
  { key: "Generating PDF Data", icon: "📄", label: "Report Generation" },
];

interface Props {
  events: ProgressEvent[];
  progress: number;
  currentStep: string;
  currentMessage: string;
}

export function AuditProgress({ events, progress, currentStep, currentMessage }: Props) {
  const completedSteps = new Set(events.map((e) => e.step));

  return (
    <div className="space-y-6">
      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-white/70">{currentMessage}</span>
          <span className="text-sm font-bold text-indigo-400">{Math.round(progress)}%</span>
        </div>
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-700 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Step tracker */}
      <div className="space-y-2">
        {STEPS.map((step) => {
          const isActive = currentStep === step.key;
          const isDone =
            completedSteps.has(step.key) && currentStep !== step.key;
          const isPending = !isActive && !isDone;

          return (
            <div
              key={step.key}
              className={`flex items-center gap-3 rounded-lg px-4 py-2.5 transition-all duration-300 ${
                isActive
                  ? "bg-indigo-500/15 ring-1 ring-indigo-500/40"
                  : isDone
                  ? "bg-emerald-500/8"
                  : "opacity-40"
              }`}
            >
              {/* Status indicator */}
              <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center">
                {isDone ? (
                  <span className="text-emerald-400 text-sm">✓</span>
                ) : isActive ? (
                  <span className="animate-spin text-indigo-400 text-sm">⟳</span>
                ) : (
                  <span className={`text-sm ${isPending ? "text-white/30" : ""}`}>
                    {step.icon}
                  </span>
                )}
              </div>

              {/* Step info */}
              <div className="flex-1 min-w-0">
                <span
                  className={`text-sm font-medium ${
                    isDone
                      ? "text-emerald-400"
                      : isActive
                      ? "text-white"
                      : "text-white/40"
                  }`}
                >
                  {step.icon} {step.label}
                </span>
                {isActive && (
                  <p className="text-xs text-white/50 truncate mt-0.5">
                    {currentMessage}
                  </p>
                )}
              </div>

              {/* Done check */}
              {isDone && (
                <span className="text-xs text-emerald-400/60">Done</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
