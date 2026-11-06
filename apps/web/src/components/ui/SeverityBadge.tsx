import type { SeverityLevel } from "@/types";
import { severityBadgeClasses } from "@/utils/badges";
import { cn } from "@/utils/cn";

interface SeverityBadgeProps {
  severity: SeverityLevel;
  compact?: boolean;
}

export function SeverityBadge({ severity, compact = false }: SeverityBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border font-bold",
        compact ? "px-2.5 py-1 text-[11px]" : "px-3 py-1.5 text-xs",
        severityBadgeClasses[severity],
      )}
    >
      {severity} severity
    </span>
  );
}
