import type { Report } from "@/types";
import { CoordinateMapPreview } from "@/components/map/BrowserMaps";
import { SeverityBadge } from "@/components/ui/SeverityBadge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import AppLink from "next/link";
import { formatCoordinates, formatDate } from "@/utils/format";

interface ReportCardProps {
  report: Report;
}

export function ReportCard({ report }: ReportCardProps) {
  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-card">
      <CoordinateMapPreview
        coordinates={report.publicCoordinatesApproximate}
        label={report.approximateLocationLabel}
        severity={report.severity}
        zoom={9}
        heightClass="h-44"
        title="Map preview"
      />
      <div className="flex flex-1 flex-col p-5">
        <div className="flex flex-wrap gap-2">
          <SeverityBadge severity={report.severity} compact />
          <StatusBadge status={report.status} compact />
        </div>
        <h2 className="mt-4 text-lg font-bold leading-snug">{report.title}</h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          {report.approximateLocationLabel}, {report.region} Region
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-muted">
          <div>
            <span className="block font-bold text-ink">Date</span>
            {formatDate(report.dateSubmitted)}
          </div>
          <div>
            <span className="block font-bold text-ink">Media</span>
            {report.mediaType}
          </div>
          <div className="col-span-2">
            <span className="block font-bold text-ink">Public coordinates</span>
            {formatCoordinates(report.publicCoordinatesApproximate.lat, report.publicCoordinatesApproximate.lng)}
          </div>
        </div>
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <AppLink
            href="/map"
            className="inline-flex items-center justify-center rounded-xl border border-line px-4 py-2.5 text-sm font-bold text-forest-800 hover:bg-forest-50"
          >
            View on Map
          </AppLink>
          <AppLink
            href={`/reports/${report.id}`}
            className="inline-flex items-center justify-center rounded-xl bg-forest-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-forest-800"
          >
            View Details
          </AppLink>
        </div>
      </div>
    </article>
  );
}
