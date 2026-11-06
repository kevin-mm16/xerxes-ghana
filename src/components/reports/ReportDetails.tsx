import type { Report, VerificationEvent } from "@/types";
import { CoordinateMapPreview } from "@/components/map/CoordinateMapPreview";
import { EvidencePreview } from "@/components/reports/EvidencePreview";
import { RelatedReports } from "@/components/reports/RelatedReports";
import { SatelliteComparisonPlaceholder } from "@/components/reports/SatelliteComparisonPlaceholder";
import { VerificationTimeline } from "@/components/reports/VerificationTimeline";
import { SafetyNotice } from "@/components/ui/SafetyNotice";
import { SeverityBadge } from "@/components/ui/SeverityBadge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { AppLink } from "@/utils/navigation";
import { formatCoordinates, formatDate, formatPercent } from "@/utils/format";

interface ReportDetailsProps {
  report: Report;
  relatedReports: Report[];
  events: VerificationEvent[];
}

export function ReportDetails({ report, relatedReports, events }: ReportDetailsProps) {
  return (
    <div>
      <AppLink href="/map" className="mb-6 inline-flex text-sm font-bold text-forest-800 hover:underline">
        Back to map
      </AppLink>

      <div className="mb-6 flex flex-wrap gap-2">
        <SeverityBadge severity={report.severity} />
        <StatusBadge status={report.status} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.45fr_0.9fr]">
        <div className="space-y-6">
          <div>
            <h1 className="font-serif text-4xl font-medium leading-tight tracking-tight md:text-5xl">
              {report.title}
            </h1>
            <p className="mt-3 text-base leading-7 text-muted">
              {report.approximateLocationLabel}, {report.region} Region. Public location is approximate.
            </p>
          </div>

          <EvidencePreview report={report} />

          <section className="rounded-2xl border border-line bg-white p-5 shadow-card">
            <h2 className="text-lg font-bold">Report description</h2>
            <p className="mt-3 text-base leading-8 text-muted">{report.description}</p>
            <dl className="mt-5 grid gap-4 border-t border-line pt-5 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs font-bold uppercase tracking-[0.12em] text-faint">Region and district</dt>
                <dd className="mt-1 font-semibold">{report.region} - {report.district}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-[0.12em] text-faint">Approximate location</dt>
                <dd className="mt-1 font-semibold">{report.approximateLocationLabel}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-[0.12em] text-faint">Public coordinates</dt>
                <dd className="mt-1 font-semibold">
                  {formatCoordinates(report.publicCoordinatesApproximate.lat, report.publicCoordinatesApproximate.lng)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-[0.12em] text-faint">Affected water body</dt>
                <dd className="mt-1 font-semibold">{report.affectedRiverOrWaterBody ?? "Not listed"}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-[0.12em] text-faint">Evidence confidence</dt>
                <dd className="mt-1 font-semibold">{formatPercent(report.evidenceConfidenceScore)}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-[0.12em] text-faint">Date observed</dt>
                <dd className="mt-1 font-semibold">{formatDate(report.dateObserved)}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-[0.12em] text-faint">Date submitted</dt>
                <dd className="mt-1 font-semibold">{formatDate(report.dateSubmitted)}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs font-bold uppercase tracking-[0.12em] text-faint">Verification source</dt>
                <dd className="mt-1 font-semibold">{report.verificationSource}</dd>
              </div>
            </dl>
          </section>

          <SatelliteComparisonPlaceholder />
        </div>

        <div className="space-y-6">
          <SafetyNotice title="Public safety note" tone="privacy">
            This public view excludes exact GPS coordinates, raw media, reporter identity, and internal notes. Unverified
            reports are not presented as confirmed facts.
          </SafetyNotice>
          <section className="rounded-2xl border border-line bg-white p-5 shadow-card">
            <h2 className="mb-4 text-lg font-bold">Public coordinate preview</h2>
            <CoordinateMapPreview
              coordinates={report.publicCoordinatesApproximate}
              label={report.approximateLocationLabel}
              severity={report.severity}
              zoom={10}
              heightClass="h-72"
              interactive
              showAttribution
              title="Public map"
            />
            <p className="mt-3 text-xs leading-5 text-muted">
              Uses the public coordinate field for this report. Private exact coordinates remain moderator-only.
            </p>
          </section>
          <VerificationTimeline events={events} />
          <RelatedReports reports={relatedReports} />
        </div>
      </div>
    </div>
  );
}
