import type { Report, ReportStatus } from "@/types";
import { SeverityBadge } from "@/components/ui/SeverityBadge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDate } from "@/utils/format";

interface ReviewQueueTableProps {
  reports: Report[];
  onSelect: (report: Report) => void;
  onStatusChange: (reportId: string, status: ReportStatus) => void;
}

export function ReviewQueueTable({ reports, onSelect, onStatusChange }: ReviewQueueTableProps) {
  return (
    <section id="review-queue" className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-5">
        <div>
          <h2 className="font-bold">Review queue</h2>
          <p className="mt-1 text-sm text-slate-500">Actions are staged locally until backend integration.</p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
          {reports.length} reports
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-[900px] w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-[0.12em] text-slate-500">
            <tr>
              <th className="px-5 py-3">Report title</th>
              <th className="px-5 py-3">Region</th>
              <th className="px-5 py-3">District</th>
              <th className="px-5 py-3">Severity</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Date submitted</th>
              <th className="px-5 py-3">Assigned moderator</th>
              <th className="px-5 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {reports.map((report) => (
              <tr key={report.id} className="align-top">
                <td className="px-5 py-4 font-semibold text-slate-900">{report.title}</td>
                <td className="px-5 py-4 text-slate-600">{report.region}</td>
                <td className="px-5 py-4 text-slate-600">{report.district}</td>
                <td className="px-5 py-4"><SeverityBadge severity={report.severity} compact /></td>
                <td className="px-5 py-4"><StatusBadge status={report.status} compact /></td>
                <td className="px-5 py-4 text-slate-600">{formatDate(report.dateSubmitted)}</td>
                <td className="px-5 py-4 text-slate-600">{report.assignedModerator ?? "Unassigned"}</td>
                <td className="px-5 py-4">
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => onSelect(report)}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                    >
                      Review
                    </button>
                    <button
                      type="button"
                      onClick={() => onStatusChange(report.id, "Verified")}
                      className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800"
                    >
                      Verify
                    </button>
                    <button
                      type="button"
                      onClick={() => onStatusChange(report.id, "Rejected")}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700"
                    >
                      Reject
                    </button>
                    <button
                      type="button"
                      onClick={() => onStatusChange(report.id, "Escalated")}
                      className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-800"
                    >
                      Escalate
                    </button>
                    <button
                      type="button"
                      onClick={() => onStatusChange(report.id, "Under Review")}
                      className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800"
                    >
                      Assign
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
