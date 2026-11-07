import type { Report } from "@/types";
import { CoordinateMapPreview } from "@/components/map/BrowserMaps";
import { SeverityBadge } from "@/components/ui/SeverityBadge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import AppLink from "next/link";
import { formatCoordinates, formatDate } from "@/utils/format";

interface HotspotCardProps {
  report: Report;
}

export function HotspotCard({ report }: HotspotCardProps) {
  return (
    <article className="overflow-hidden rounded-2xl border border-line bg-white shadow-card">
      <CoordinateMapPreview
        coordinates={report.publicCoordinatesApproximate}
        label={report.approximateLocationLabel}
        severity={report.severity}
        zoom={9}
        heightClass="h-40"
        title="Public coordinate"
      />
      <div className="p-5">
        <div className="flex flex-wrap gap-2">
          <SeverityBadge severity={report.severity} compact />
          <StatusBadge status={report.status} compact />
        </div>
        <h3 className="mt-4 text-lg font-bold leading-snug">{report.title}</h3>
        <dl className="mt-4 grid gap-3 text-sm text-muted sm:grid-cols-2">
          <div>
            <dt className="text-xs font-bold uppercase tracking-[0.12em] text-faint">Region</dt>
            <dd className="mt-1 text-ink">{report.region}</dd>
          </div>
          <div>
            <dt className="text-xs font-bold uppercase tracking-[0.12em] text-faint">District</dt>
            <dd className="mt-1 text-ink">{report.district}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs font-bold uppercase tracking-[0.12em] text-faint">Approximate location</dt>
            <dd className="mt-1 text-ink">{report.approximateLocationLabel}</dd>
          </div>
          <div>
            <dt className="text-xs font-bold uppercase tracking-[0.12em] text-faint">Observed</dt>
            <dd className="mt-1 text-ink">{formatDate(report.dateObserved)}</dd>
          </div>
          <div>
            <dt className="text-xs font-bold uppercase tracking-[0.12em] text-faint">Submitted</dt>
            <dd className="mt-1 text-ink">{formatDate(report.dateSubmitted)}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs font-bold uppercase tracking-[0.12em] text-faint">Public coordinates</dt>
            <dd className="mt-1 text-ink">
              {formatCoordinates(report.publicCoordinatesApproximate.lat, report.publicCoordinatesApproximate.lng)}
            </dd>
          </div>
        </dl>
        <AppLink
          href={`/reports/${report.id}`}
          className="mt-5 inline-flex w-full items-center justify-center rounded-xl border border-line px-4 py-2.5 text-sm font-bold text-forest-800 hover:border-forest-600 hover:bg-forest-50"
        >
          View Details
        </AppLink>
      </div>
    </article>
  );
}
