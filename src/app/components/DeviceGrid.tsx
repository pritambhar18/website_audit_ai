// src/app/components/DeviceGrid.tsx
"use client";

import { useState } from "react";
import type { DeviceResult, DeviceCategory } from "@/lib/types";
import { IssueCard } from "./IssueCard";

interface Props {
  devices: DeviceResult[];
  category?: DeviceCategory;
}

const PRIORITY_MAP: Record<string, string> = {
  critical: "P1 · Immediate",
  high:     "P2 · High",
  medium:   "P3 · Medium",
  low:      "P4 · Low",
};

const PRIORITY_COLOR: Record<string, string> = {
  critical: "text-red-300 bg-red-900/40",
  high:     "text-orange-300 bg-orange-900/40",
  medium:   "text-yellow-300 bg-yellow-900/40",
  low:      "text-blue-300 bg-blue-900/40",
};

export function DeviceGrid({ devices, category }: Props) {
  const [selected, setSelected] = useState<DeviceResult | null>(null);

  const filtered = category
    ? devices.filter((d) => d.device.category === category)
    : devices;

  if (filtered.length === 0) {
    return (
      <p className="text-white/40 text-sm text-center py-8">
        No screenshots available for this category.
      </p>
    );
  }

  const passDevices = filtered.filter((d) => d.aiIssues.length === 0);
  const failDevices = filtered.filter((d) => d.aiIssues.length > 0);

  return (
    <div className="space-y-6">

      {/* ── PASS summary banner ─────────────────────────────── */}
      {passDevices.length > 0 && (
        <div className="flex items-start gap-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 px-4 py-3">
          <span className="text-emerald-400 text-lg mt-0.5">✅</span>
          <div>
            <p className="text-sm font-semibold text-emerald-300">PASS — No issues detected</p>
            <p className="text-xs text-emerald-400/70 mt-0.5">
              {passDevices.map((d) => `${d.device.name} (${d.device.width}×${d.device.height})`).join(" · ")}
            </p>
          </div>
        </div>
      )}

      {/* ── Per-device issues ───────────────────────────────── */}
      {failDevices.length > 0 && (
        <div className="space-y-4">
          <p className="text-xs font-semibold text-white/40 uppercase tracking-widest">
            Devices with issues ({failDevices.length})
          </p>
          {failDevices.map((device, i) => (
            <div key={i} className="rounded-xl overflow-hidden ring-1 ring-red-500/30">
              <div className="flex items-center gap-3 bg-gray-900/80 px-4 py-3 border-b border-white/10">
                <span className="text-base">⚠️</span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white">{device.device.name}</p>
                  <p className="text-xs text-white/40">
                    {device.device.width}×{device.device.height} · {device.device.category} · {(device.loadTimeMs / 1000).toFixed(1)}s load
                  </p>
                </div>
                <span className="text-xs bg-red-500/20 text-red-400 ring-1 ring-red-500/30 rounded-full px-2 py-0.5 font-semibold">
                  {device.aiIssues.length} issue{device.aiIssues.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="bg-gray-900/40 p-4 space-y-3">
                {device.aiIssues.map((issue) => (
                  <div key={issue.id}>
                    <IssueCard issue={issue} />
                    {PRIORITY_MAP[issue.severity] && (
                      <span className={`mt-1 inline-block text-[10px] font-semibold rounded px-2 py-0.5 ${PRIORITY_COLOR[issue.severity]}`}>
                        Priority: {PRIORITY_MAP[issue.severity]}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Screenshot grid ─────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filtered.map((device, i) => {
          const hasFail = device.aiIssues.length > 0;
          return (
            <button
              key={i}
              id={`device-${device.device.name.replace(/\s+/g, "-").toLowerCase()}`}
              onClick={() => setSelected(selected?.device.name === device.device.name ? null : device)}
              className={`group rounded-xl overflow-hidden ring-2 transition-all hover:scale-105 text-left ${
                selected?.device.name === device.device.name
                  ? "ring-indigo-500 scale-105"
                  : hasFail
                  ? "ring-red-500/40 hover:ring-red-500/70"
                  : "ring-emerald-500/30 hover:ring-emerald-500/60"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`data:image/jpeg;base64,${device.screenshotBase64}`}
                alt={`Screenshot of ${device.device.name}`}
                className="w-full object-cover object-top bg-gray-900"
                style={{ height: "180px" }}
              />
              <div className={`px-3 py-2 ${hasFail ? "bg-red-950/60" : "bg-emerald-950/40"}`}>
                <p className="text-[11px] font-medium text-white/80 truncate">{device.device.name}</p>
                <p className="text-[10px] text-white/40">
                  {device.device.width}×{device.device.height} · {(device.loadTimeMs / 1000).toFixed(1)}s
                </p>
                <p className={`text-[10px] font-semibold mt-0.5 ${hasFail ? "text-red-400" : "text-emerald-400"}`}>
                  {hasFail ? `⚠ ${device.aiIssues.length} issue(s)` : "✓ PASS"}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Expanded screenshot view ─────────────────────────── */}
      {selected && (
        <div className="rounded-2xl ring-1 ring-indigo-500/30 bg-gray-900/60 backdrop-blur-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <div>
              <p className="text-sm font-semibold text-white">{selected.device.name}</p>
              <p className="text-xs text-white/40">
                {selected.device.width}×{selected.device.height} px · {selected.device.category} · {(selected.loadTimeMs / 1000).toFixed(2)}s
              </p>
            </div>
            <button onClick={() => setSelected(null)} className="text-white/40 hover:text-white/80 text-sm px-2 py-1 rounded-lg hover:bg-white/10 transition-colors">
              ✕ Close
            </button>
          </div>
          <div className="overflow-auto max-h-[500px] bg-gray-950">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`data:image/jpeg;base64,${selected.screenshotBase64}`} alt={`Full screenshot of ${selected.device.name}`} className="w-full" />
          </div>
          {selected.aiIssues.length === 0 && (
            <div className="p-4 flex items-center gap-3 border-t border-white/10 bg-emerald-500/5">
              <span className="text-emerald-400">✅</span>
              <p className="text-sm text-emerald-300 font-medium">No issues detected on this device — PASS</p>
            </div>
          )}
          {selected.aiIssues.length > 0 && (
            <div className="p-4 space-y-3 border-t border-white/10">
              <p className="text-xs font-semibold text-white/60 uppercase tracking-widest">
                Issues on this device ({selected.aiIssues.length})
              </p>
              {selected.aiIssues.map((issue) => (
                <div key={issue.id}>
                  <IssueCard issue={issue} />
                  {PRIORITY_MAP[issue.severity] && (
                    <span className={`mt-1 inline-block text-[10px] font-semibold rounded px-2 py-0.5 ${PRIORITY_COLOR[issue.severity]}`}>
                      Priority: {PRIORITY_MAP[issue.severity]}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
