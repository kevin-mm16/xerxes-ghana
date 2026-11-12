"use client";

import { useEffect, useRef } from "react";
import AppLink from "next/link";
import { Badge, Icon, IconButton, SectionLabel } from "@/components/ui";
import type { IntelligenceFeature } from "@/types/intelligence";
import { formatDate } from "@/utils/format";
import { PublicMediaPlayer } from "@/components/evidence/PublicMediaPlayer";
import { safePublicMedia } from "@/utils/public-media";

const featureLabels: Record<IntelligenceFeature["type"], string> = {
  administrative_boundary: "District reference",
  coverage_region: "Monitoring area",
  citizen_observation: "Reviewed observation",
  approved_video: "Reviewed observation",
  ai_candidate: "AI candidate",
  satellite_change: "Satellite change",
};

export function IntelligenceDrawer({
  feature,
  onClose,
}: {
  feature?: IntelligenceFeature;
  onClose: () => void;
}) {
  const panel = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!feature) return;
    const previous = document.activeElement as HTMLElement | null;
    const element = panel.current;
    element?.focus({ preventScroll: true });
    function escape(event: KeyboardEvent) {
      if (event.key === "Escape" && !event.defaultPrevented) onClose();
    }
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("keydown", escape);
      if (
        document.activeElement === document.body ||
        element?.contains(document.activeElement)
      )
        previous?.focus();
    };
  }, [feature?.id, onClose]);
  if (!feature) return null;
  const p = feature.properties;
  const reference = feature.type === "administrative_boundary";
  const locationLabel = reference
    ? (p.region ?? p.publicLabel)
    : (p.publicLabel ?? p.region);
  const observation =
    feature.type === "citizen_observation" || feature.type === "approved_video";
  const media =
    observation && p.status === "Verified"
      ? safePublicMedia(p.media)
      : undefined;
  return (
    <aside
      ref={panel}
      tabIndex={-1}
      role="region"
      aria-labelledby="map-details-title"
      className="absolute bottom-0 left-0 right-0 z-[650] max-h-[48%] overflow-y-auto rounded-t-lg border-t border-line bg-paper p-5 shadow-lift outline-none lg:bottom-9 lg:left-auto lg:right-3 lg:top-16 lg:max-h-none lg:w-[352px] lg:rounded-md lg:border"
    >
      <div
        className="mx-auto mb-4 h-1 w-10 rounded-full bg-line lg:hidden"
        aria-hidden="true"
      />
      <div className="flex items-start justify-between gap-3">
        <SectionLabel>{featureLabels[feature.type]}</SectionLabel>
        <IconButton
          icon="x"
          label="Close details"
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="-mr-2 -mt-2"
        />
      </div>
      <h2
        id="map-details-title"
        className="mt-3 text-[25px] font-semibold leading-tight tracking-tight text-ink"
      >
        {p.title}
      </h2>
      {locationLabel && (
        <p className="mt-2 text-sm leading-6 text-muted">{locationLabel}</p>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        {reference && <Badge tone="gold">2021 census geography</Badge>}
        {observation && <Badge tone="green">Public reviewed record</Badge>}
        {p.isDemo && <Badge tone="amber">Demonstration</Badge>}
        {feature.type === "ai_candidate" && (
          <Badge tone="amber">Unconfirmed signal</Badge>
        )}
      </div>
      {media && (
        <div className="mt-5">
          <PublicMediaPlayer media={media} title={p.title} variant="preview" />
        </div>
      )}
      {p.summary && !reference && (
        <p className="mt-5 border-t border-line pt-4 text-sm leading-6 text-muted">
          {p.summary}
        </p>
      )}
      <dl className="mt-5 space-y-4 border-y border-line py-5 text-sm">
        {feature.observedAt && (
          <div>
            <dt className="text-xs text-muted">Observed</dt>
            <dd className="mt-1 font-medium text-ink">
              {formatDate(feature.observedAt)}
            </dd>
          </div>
        )}
        <div>
          <dt className="text-xs text-muted">Source</dt>
          <dd className="mt-1 font-medium text-ink">{p.source}</dd>
        </div>
        {p.precisionLevel && (
          <div>
            <dt className="text-xs text-muted">Public location precision</dt>
            <dd className="mt-1 text-ink">
              {p.precisionLevel.replaceAll("_", " ")}
            </dd>
          </div>
        )}
        {p.coverageCode && (
          <div>
            <dt className="text-xs text-muted">Monitoring area</dt>
            <dd className="mt-1 font-mono text-xs text-ink">
              {p.coverageCode}
            </dd>
          </div>
        )}
        {p.confidence !== undefined && (
          <div>
            <dt className="text-xs text-muted">Model confidence</dt>
            <dd className="mt-1 font-mono text-ink">
              {Math.round(p.confidence * 100)}%
            </dd>
          </div>
        )}
        {p.modelVersion && (
          <div>
            <dt className="text-xs text-muted">Model version</dt>
            <dd className="mt-1 font-mono text-xs text-ink">
              {p.modelVersion}
            </dd>
          </div>
        )}
      </dl>
      {reference && (
        <p className="mt-4 text-xs leading-5 text-muted">
          District reference, not a town perimeter or mining concession.
          Displayed edges are simplified; check later changes with GSS.
        </p>
      )}
      {p.isDemo && (
        <p className="mt-4 text-xs leading-5 text-muted">
          Demonstration monitoring geometry. It is not a legal or administrative
          boundary.
        </p>
      )}
      {feature.type === "ai_candidate" && (
        <p className="mt-4 text-xs leading-5 text-muted">
          A signal for review, not a confirmed illegal-mining finding.
        </p>
      )}
      {p.datasetVersion && (
        <p className="mt-3 break-words text-[10px] leading-5 text-muted">
          Dataset: {p.datasetVersion}
        </p>
      )}
      {p.sourceUrl && (
        <a
          href={p.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-forest-800 underline underline-offset-4"
        >
          View boundary source
          <Icon name="chevronRight" className="h-3 w-3" />
        </a>
      )}
      {p.observationId && (
        <AppLink
          href={`/reports/${p.observationId}`}
          className="mt-5 inline-flex min-h-11 w-full items-center justify-between gap-3 rounded border border-forest-800 bg-forest-800 px-4 py-2.5 text-sm font-medium text-white hover:bg-forest-600"
        >
          Open evidence record
          <Icon name="chevronRight" className="h-4 w-4" />
        </AppLink>
      )}
    </aside>
  );
}
