import type { DashboardStat } from "@/types";
import { StatCard } from "@/components/ui/StatCard";

interface DashboardStatsProps {
  stats: DashboardStat[];
}

export function DashboardStats({ stats }: DashboardStatsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      {stats.map((stat) => (
        <StatCard key={stat.label} label={stat.label} value={stat.value} detail={stat.detail} tone={stat.tone} />
      ))}
    </div>
  );
}
