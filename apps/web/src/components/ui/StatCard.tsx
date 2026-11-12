import type { ReactNode } from "react";
import { cn } from "@/utils/cn";

interface StatCardProps {
  label: string;
  value: string;
  detail?: string;
  tone?: "neutral" | "warning" | "success" | "critical";
  icon?: ReactNode;
}

const toneClasses = {
  neutral: "border-ink/10 text-ink",
  warning: "border-amber-200 text-amber-800",
  success: "border-emerald-200 text-emerald-800",
  critical: "border-red-200 text-red-800",
};

export function StatCard({ label, value, detail, tone = "neutral", icon }: StatCardProps) {
  return (
    <div className="rounded-2xl border border-line bg-white p-5 shadow-card">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted">{label}</p>
          <p className={cn("mt-2 font-serif text-4xl font-semibold leading-none", toneClasses[tone])}>
            {value}
          </p>
        </div>
        {icon ? (
          <div className={cn("rounded-xl border p-2.5", toneClasses[tone])}>{icon}</div>
        ) : null}
      </div>
      {detail ? <p className="mt-3 text-xs text-faint">{detail}</p> : null}
    </div>
  );
}
