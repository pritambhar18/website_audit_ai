// src/app/components/MetricCard.tsx
"use client";

interface Props {
  label: string;
  value: string | number;
  status?: "pass" | "fail" | "warn" | "neutral";
  subtitle?: string;
  icon?: string;
}

const statusStyles = {
  pass: "text-emerald-400",
  fail: "text-red-400",
  warn: "text-yellow-400",
  neutral: "text-white/80",
};

export function MetricCard({ label, value, status = "neutral", subtitle, icon }: Props) {
  return (
    <div className="flex flex-col items-center justify-center bg-white/5 backdrop-blur-sm rounded-xl p-4 ring-1 ring-white/10 text-center gap-1 hover:bg-white/10 transition-all">
      {icon && <span className="text-xl mb-1">{icon}</span>}
      <span className={`text-2xl font-bold ${statusStyles[status]}`}>
        {value}
      </span>
      <span className="text-xs text-white/50 font-medium">{label}</span>
      {subtitle && (
        <span className="text-[10px] text-white/30">{subtitle}</span>
      )}
    </div>
  );
}
