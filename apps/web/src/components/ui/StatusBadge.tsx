import type { ReportStatus } from "@/types";
import { statusBadgeClasses, statusLabels } from "@/utils/badges";
import { cn } from "@/utils/cn";

interface StatusBadgeProps {
  status: ReportStatus;
  compact?: boolean;
}

export function StatusBadge({ status, compact = false }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-semibold",
        compact ? "px-2.5 py-1 text-[11px]" : "px-3 py-1.5 text-xs",
        statusBadgeClasses[status],
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {statusLabels[status]}
    </span>
  );
}
