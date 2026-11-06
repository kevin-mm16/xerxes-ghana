import type { Report } from "@/types";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { AppLink } from "@/utils/navigation";
import { formatDate } from "@/utils/format";

interface RelatedReportsProps {
  reports: Report[];
}

export function RelatedReports({ reports }: RelatedReportsProps) {
  return (
    <section className="rounded-2xl border border-line bg-white p-5 shadow-card">
      <h2 className="text-lg font-bold">Related nearby reports</h2>
      <div className="mt-4 space-y-3">
        {reports.map((report) => (
          <AppLink
            key={report.id}
            href={`/reports/${report.id}`}
            className="block rounded-xl border border-line p-4 transition hover:border-forest-600 hover:bg-forest-50"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold leading-snug">{report.title}</h3>
                <p className="mt-1 text-sm text-muted">
                  {report.region} - {report.district} - {formatDate(report.dateSubmitted)}
                </p>
              </div>
              <StatusBadge status={report.status} compact />
            </div>
          </AppLink>
        ))}
      </div>
    </section>
  );
}
