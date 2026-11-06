import type { ReactNode } from "react";
import { cn } from "@/utils/cn";

interface SafetyNoticeProps {
  title: string;
  children: ReactNode;
  tone?: "warning" | "privacy" | "admin";
}

const toneClasses = {
  warning: "border-red-200 bg-red-50 text-red-950",
  privacy: "border-emerald-200 bg-emerald-50 text-emerald-950",
  admin: "border-amber-300 bg-amber-50 text-amber-950",
};

export function SafetyNotice({ title, children, tone = "warning" }: SafetyNoticeProps) {
  return (
    <section className={cn("rounded-2xl border p-5", toneClasses[tone])}>
      <div className="flex gap-3">
        <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-current" />
        <div>
          <h2 className="text-sm font-bold uppercase tracking-[0.12em]">{title}</h2>
          <div className="mt-2 text-sm leading-6">{children}</div>
        </div>
      </div>
    </section>
  );
}
