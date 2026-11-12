import AppLink from "next/link";
import { Badge, Icon } from "@/components/ui";
import type { IntelligenceFeature } from "@/types/intelligence";

export function publicObservedDate(value?: string) {
  if (!value || Number.isNaN(Date.parse(value))) return "Date not provided";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

export function ObservationRecord({
  feature,
}: {
  feature: IntelligenceFeature;
}) {
  const { properties } = feature;
  const recordId = properties.observationId;
  return (
    <article className="record-list-item">
      <div className="record-list-date">
        <p className="ui-section-label">Observed</p>
        <p className="mt-2 text-xs text-muted">
          {publicObservedDate(feature.observedAt)}
        </p>
      </div>
      <div className="min-w-0">
        <h2 className="break-words text-lg font-semibold leading-snug tracking-tight">
          {recordId ? (
            <AppLink href={`/reports/${recordId}`}>{properties.title}</AppLink>
          ) : (
            properties.title
          )}
        </h2>
        <p className="mt-2 text-xs text-muted">
          {properties.publicLabel ?? "Generalized public location"}
        </p>
        {properties.summary ? (
          <p className="mt-3 max-w-2xl text-sm leading-7 text-muted">
            {properties.summary}
          </p>
        ) : null}
      </div>
      <div className="record-list-meta flex flex-wrap items-center gap-3 md:flex-col md:items-start">
        <Badge tone="green">Human reviewed</Badge>
        <span className="text-[10px] text-muted">Public summary</span>
      </div>
      {recordId ? (
        <AppLink
          href={`/reports/${recordId}`}
          aria-label={`Open reviewed record: ${properties.title}`}
          className="col-start-2 row-start-2 inline-flex h-10 w-9 items-center justify-center self-start rounded-sm text-muted hover:text-forest-800 md:col-auto md:row-auto md:self-center"
        >
          <Icon name="arrow-up-right" className="h-4 w-4" />
        </AppLink>
      ) : (
        <span />
      )}
    </article>
  );
}
