import AppLink from "next/link";
import { notFound } from "next/navigation";
import { PublicLocationMap } from "@/components/evidence/PublicLocationMap";
import { publicObservedDate } from "@/components/evidence/ObservationRecord";
import {
  Alert,
  Badge,
  Icon,
  LinkButton,
  SectionLabel,
  buttonStyles,
} from "@/components/ui";
import type { PublicObservation } from "@/types/api";

function RecordUnavailable({ reportId }: { reportId: string }) {
  return (
    <section className="page-shell">
      <div className="mx-auto max-w-3xl py-10">
        <SectionLabel>Public record</SectionLabel>
        <h1 className="page-heading mt-4">Record temporarily unavailable</h1>
        <p className="page-intro mt-5">
          The observation service could not return this record. Please try
          again.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <a href={`/reports/${reportId}`} className={buttonStyles()}>
            Try again
          </a>
          <LinkButton href="/evidence" variant="secondary">
            View evidence feed
          </LinkButton>
        </div>
      </div>
    </section>
  );
}

export async function ReportDetailsPage({ reportId }: { reportId: string }) {
  if (!/^[0-9a-f-]{36}$/i.test(reportId)) notFound();
  const base = process.env.API_INTERNAL_URL ?? "http://127.0.0.1:8000";
  let response: Response;
  try {
    response = await fetch(`${base}/api/v1/observations/${reportId}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    return <RecordUnavailable reportId={reportId} />;
  }
  if (response.status === 404 || response.status === 422) notFound();
  if (!response.ok) return <RecordUnavailable reportId={reportId} />;
  let record: PublicObservation;
  try {
    record = await response.json();
  } catch {
    return <RecordUnavailable reportId={reportId} />;
  }
  if (record.status !== "approved") notFound();

  return (
    <article className="page-shell">
      <AppLink
        href="/evidence"
        className="inline-flex min-h-10 items-center gap-2 text-xs text-muted hover:text-ink"
      >
        <Icon name="arrow-left" className="h-4 w-4" />
        Reviewed observations
      </AppLink>
      <header className="border-b border-line pb-8 pt-6">
        <div className="flex flex-wrap items-center gap-4">
          <SectionLabel>Public observation</SectionLabel>
          <Badge tone="green">Human reviewed</Badge>
        </div>
        <h1 className="page-heading mt-5 max-w-4xl break-words">
          {record.title}
        </h1>
        <p className="mt-5 text-sm text-muted">{record.publicLabel}</p>
        <p className="mt-2 text-xs text-muted">
          Observed {publicObservedDate(record.observedAt)}
        </p>
      </header>

      <div className="grid min-w-0 gap-10 py-9 lg:grid-cols-[minmax(0,1fr)_280px] lg:gap-16">
        <div className="min-w-0">
          <section aria-labelledby="summary-heading">
            <h2
              id="summary-heading"
              className="text-lg font-semibold tracking-tight"
            >
              Public summary
            </h2>
            <p className="mt-4 whitespace-pre-line text-sm leading-8 text-muted">
              {record.description}
            </p>
          </section>
          <div className="mt-7 flex items-start gap-3 border-y border-line py-4 text-xs leading-6 text-muted">
            <Icon name="file" className="mt-0.5 h-4 w-4" />
            <p>
              Text record. No public image or video is available on this record.
            </p>
          </div>
          <section aria-labelledby="public-location-heading" className="mt-9">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2
                id="public-location-heading"
                className="text-lg font-semibold tracking-tight"
              >
                Public location
              </h2>
              <Badge tone="neutral">Generalized</Badge>
            </div>
            <PublicLocationMap
              geometry={record.publicLocation}
              label={record.publicLabel}
            />
            <p className="mt-4 text-xs leading-6 text-muted">
              This map shows the published location geometry. It does not
              identify the original capture point.
            </p>
          </section>
        </div>

        <aside
          aria-label="Record metadata"
          className="min-w-0 border-t border-line pt-6 lg:border-l lg:border-t-0 lg:pl-7 lg:pt-0"
        >
          <SectionLabel>Record information</SectionLabel>
          <dl className="mt-5 divide-y divide-line text-xs">
            <div className="pb-5">
              <dt className="text-muted">Review state</dt>
              <dd className="mt-2 font-medium">Approved public summary</dd>
            </div>
            <div className="py-5">
              <dt className="text-muted">Observed</dt>
              <dd className="mt-2 font-medium">
                {publicObservedDate(record.observedAt)}
              </dd>
            </div>
            <div className="py-5">
              <dt className="text-muted">Generalized location</dt>
              <dd className="mt-2 break-words font-medium">
                {record.publicLabel}
              </dd>
            </div>
            <div className="py-5">
              <dt className="text-muted">Public precision</dt>
              <dd className="mt-2 break-words font-medium capitalize">
                {record.precisionLevel === "coverage-region"
                  ? "Monitoring region"
                  : record.precisionLevel.replace(/[-_]/g, " ")}
              </dd>
            </div>
            <div className="py-5">
              <dt className="text-muted">Source</dt>
              <dd className="mt-2 font-medium">
                XERSXES public observation service
              </dd>
            </div>
            <div className="py-5">
              <dt className="text-muted">Record identifier</dt>
              <dd className="mt-2 break-all font-mono text-[10px]">
                {record.id}
              </dd>
            </div>
          </dl>
          <AppLink
            href="/about"
            className="mt-5 inline-flex min-h-10 items-center gap-2 text-xs font-medium text-forest-800"
          >
            How records are handled
            <Icon name="arrow-up-right" className="h-3.5 w-3.5" />
          </AppLink>
        </aside>
      </div>

      <Alert tone="neutral" title="Public and private evidence are separate">
        Capture coordinates, original intake text and private media are excluded
        from this public record. Generalized geography should not be treated as
        an exact incident location.
      </Alert>
    </article>
  );
}
