import type { Report } from "@/types";
import { SeverityBadge } from "@/components/ui/SeverityBadge";
import { StatusBadge } from "@/components/ui/StatusBadge";

interface PriorityQueueProps {
  reports: Report[];
  onSelect: (report: Report) => void;
}

export function PriorityQueue({ reports, onSelect }: PriorityQueueProps) {
  const criticalReports = reports.filter((report) => report.severity === "Critical");

  return (
    <section className="rounded-2xl border border-red-200 bg-red-50 p-5">
      <h2 className="font-bold text-red-950">Priority queue</h2>
      <p className="mt-1 text-sm text-red-900">Critical reports needing immediate review or escalation decision.</p>
      <div className="mt-4 space-y-3">
        {criticalReports.map((report) => (
          <button
            key={report.id}
            type="button"
            onClick={() => onSelect(report)}
            className="w-full rounded-xl border border-red-200 bg-white p-4 text-left shadow-sm hover:border-red-400"
          >
            <div className="flex flex-wrap gap-2">
              <SeverityBadge severity={report.severity} compact />
              <StatusBadge status={report.status} compact />
            </div>
            <p className="mt-3 font-semibold text-slate-900">{report.title}</p>
            <p className="mt-1 text-sm text-slate-600">{report.region} - {report.district}</p>
          </button>
        ))}
      </div>
    </section>
  );
}
