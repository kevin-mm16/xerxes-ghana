import AppLink from "next/link";
import type { IntelligenceFeature } from "@/types/intelligence";
import { formatDate } from "@/utils/format";

interface IntelligenceDrawerProps {
  feature?: IntelligenceFeature;
  onClose: () => void;
}

const featureLabels: Record<IntelligenceFeature["type"], string> = {
  administrative_boundary: "District boundary",
  coverage_region: "Coverage region",
  citizen_observation: "Public observation",
  approved_video: "Approved video",
  ai_candidate: "AI candidate",
  satellite_change: "Satellite change",
};

export function IntelligenceDrawer({
  feature,
  onClose,
}: IntelligenceDrawerProps) {
  if (!feature) return null;

  const confidence =
    feature.properties.confidence === undefined
      ? null
      : `${Math.round(feature.properties.confidence * 100)}%`;

  return (
    <aside className="absolute bottom-16 left-4 right-4 z-[650] max-h-[42%] overflow-y-auto rounded-2xl border border-white/70 bg-white/95 p-5 shadow-lift backdrop-blur lg:bottom-20 lg:left-auto lg:right-4 lg:top-20 lg:w-[360px] lg:max-h-none">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-forest-600">
            {featureLabels[feature.type]}
          </p>
          <h2 className="mt-2 text-xl font-bold leading-snug text-ink">
            {feature.properties.title}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close details"
          className="rounded-lg border border-line px-2.5 py-1.5 text-sm font-bold text-muted hover:bg-paper"
        >
          ×
        </button>
      </div>

      {feature.properties.publicLabel ? (
        <p className="mt-3 text-sm leading-6 text-muted">
          {feature.properties.publicLabel}
        </p>
      ) : null}

      <div className="mt-4 grid grid-cols-2 gap-3 border-y border-line py-4 text-xs">
        <div>
          <span className="block font-bold uppercase tracking-[0.1em] text-faint">
            Source
          </span>
          <span className="mt-1 block font-semibold text-ink">
            {feature.properties.source}
          </span>
        </div>
        <div>
          <span className="block font-bold uppercase tracking-[0.1em] text-faint">
            Area
          </span>
          <span className="mt-1 block font-semibold text-ink">
            {feature.properties.publicLabel ??
              feature.properties.coverageCode ??
              "Not specified"}
          </span>
        </div>
        {feature.observedAt ? (
          <div>
            <span className="block font-bold uppercase tracking-[0.1em] text-faint">
              Observed
            </span>
            <span className="mt-1 block font-semibold text-ink">
              {formatDate(feature.observedAt)}
            </span>
          </div>
        ) : null}
        {confidence ? (
          <div>
            <span className="block font-bold uppercase tracking-[0.1em] text-faint">
              Confidence
            </span>
            <span className="mt-1 block font-semibold text-ink">
              {confidence}
            </span>
          </div>
        ) : null}
        {feature.properties.status ? (
          <div>
            <span className="block font-bold uppercase tracking-[0.1em] text-faint">
              Status
            </span>
            <span className="mt-1 block font-semibold text-ink">
              {feature.properties.status}
            </span>
          </div>
        ) : null}
        {feature.properties.modelVersion ? (
          <div>
            <span className="block font-bold uppercase tracking-[0.1em] text-faint">
              Model
            </span>
            <span className="mt-1 block font-semibold text-ink">
              {feature.properties.modelVersion}
            </span>
          </div>
        ) : null}
      </div>

      {feature.properties.isDemo && (
        <p className="mt-3 text-xs text-amber-900">
          Demonstration monitoring geometry; not a legal boundary.
        </p>
      )}
      {feature.properties.datasetVersion && (
        <p className="mt-3 text-xs text-muted">
          Dataset: {feature.properties.datasetVersion}. Census geography; check
          with GSS for later changes.
        </p>
      )}
      {feature.properties.sourceUrl && (
        <a
          className="mt-2 inline-block text-xs font-semibold underline"
          href={feature.properties.sourceUrl}
          target="_blank"
          rel="noreferrer"
        >
          View boundary source
        </a>
      )}
      {feature.properties.coverageCode && (
        <p className="mt-2 font-mono text-xs">
          {feature.properties.coverageCode}
        </p>
      )}
      {feature.properties.summary ? (
        <p className="mt-4 text-sm leading-6 text-muted">
          {feature.properties.summary}
        </p>
      ) : null}

      {feature.type === "ai_candidate" ? (
        <p className="mt-4 rounded-xl bg-violet-50 p-3 text-xs leading-5 text-violet-950">
          AI candidates are signals for review, not confirmed illegal-mining
          findings.
        </p>
      ) : null}

      {feature.properties.observationId ? (
        <AppLink
          href={`/reports/${feature.properties.observationId}`}
          className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-forest-800 px-4 py-2.5 text-sm font-bold text-white hover:bg-forest-600"
        >
          Open evidence record
        </AppLink>
      ) : null}
    </aside>
  );
}
