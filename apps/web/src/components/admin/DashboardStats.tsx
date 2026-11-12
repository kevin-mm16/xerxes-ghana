import type { DashboardStat } from "@/types";

interface DashboardStatsProps {
  stats: DashboardStat[];
}

export function DashboardStats({ stats }: DashboardStatsProps) {
  return (
    <dl
      aria-label="Sample queue counts"
      className="grid grid-cols-2 border-y border-[#d9ddd6] sm:grid-cols-4"
    >
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="border-[#d9ddd6] px-4 py-4 odd:border-r sm:border-r sm:last:border-r-0"
        >
          <dt className="text-[11px] font-medium text-[#65706a]">
            {stat.label}
          </dt>
          <dd className="mt-1 font-mono text-2xl font-medium tabular-nums tracking-tight text-[#172021]">
            {stat.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
