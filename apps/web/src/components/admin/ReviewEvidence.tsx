"use client";

import { useState } from "react";
import { Alert, Badge, Button, SectionLabel } from "@/components/ui";
import type { ModerationObservation } from "@/types/moderation";
import { formatDate } from "@/utils/format";

function privateUrl(
  id: string,
  url: string | null | undefined,
  kind: "review" | "thumbnail" | "original",
) {
  const expected = `/api/v1/moderation/observations/${id}/media/${kind}`;
  return url === expected ? url : undefined;
}
export function ReviewEvidence({
  observation,
}: {
  observation: ModerationObservation;
}) {
  const [openMedia, setOpenMedia] = useState(false);
  const media = observation.media;
  const reviewUrl = privateUrl(observation.id, media?.reviewUrl, "review");
  const thumbnail = privateUrl(
    observation.id,
    media?.thumbnailUrl,
    "thumbnail",
  );
  const originalUrl = privateUrl(
    observation.id,
    media?.originalUrl,
    "original",
  );
  return (
    <section
      aria-labelledby="private-evidence-heading"
      className="border-b border-line p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 id="private-evidence-heading" className="text-sm font-semibold">
          Private evidence
        </h3>
        <Badge tone="amber">Reviewer only</Badge>
      </div>
      <p className="mt-5 whitespace-pre-line break-words text-sm leading-7">
        {observation.privateDescription}
      </p>
      {observation.manualLocation && (
        <div className="mt-5">
          <SectionLabel>Contributor location description</SectionLabel>
          <p className="mt-2 whitespace-pre-line break-words text-sm leading-7 text-muted">
            {observation.manualLocation}
          </p>
        </div>
      )}
      <dl className="mt-5 grid gap-x-6 gap-y-4 text-xs sm:grid-cols-2">
        <div>
          <dt className="text-muted">Submitted</dt>
          <dd className="mt-1">{formatDate(observation.submittedAt)}</dd>
        </div>
        <div>
          <dt className="text-muted">Observed</dt>
          <dd className="mt-1">{formatDate(observation.observedAt)}</dd>
        </div>
        <div>
          <dt className="text-muted">Capture coverage check</dt>
          <dd className="mt-1 capitalize">{observation.coverageState}</dd>
        </div>
        <div>
          <dt className="text-muted">Assigned monitoring region</dt>
          <dd className="mt-1">
            {observation.coverageRegion?.name ?? "Not assigned"}
          </dd>
        </div>
        {observation.captureLocation && (
          <>
            <div>
              <dt className="text-muted">Private device capture position</dt>
              <dd className="mt-1 font-mono text-[11px]">
                {observation.captureLocation.latitude.toFixed(6)},{" "}
                {observation.captureLocation.longitude.toFixed(6)}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Reported GPS accuracy</dt>
              <dd className="mt-1">
                ±{observation.captureLocation.accuracyMeters} m ·{" "}
                {observation.captureLocation.source}
              </dd>
            </div>
          </>
        )}
      </dl>
      {media ? (
        <div className="mt-6 border-t border-line pt-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <SectionLabel>{media.mediaKind} evidence</SectionLabel>
            <Badge
              tone={
                media.processingStatus === "review_ready" ? "green" : "amber"
              }
            >
              {media.processingStatus.replaceAll("_", " ")}
            </Badge>
          </div>
          <p className="mt-3 break-all text-xs text-muted">
            {media.filename ?? "Private evidence attachment"}
            {media.fileSize
              ? ` · ${(media.fileSize / 1024 / 1024).toFixed(2)} MB`
              : ""}
          </p>
          {media.sha256 && (
            <p className="mt-3 break-all font-mono text-[10px] leading-5 text-muted">
              SHA-256 {media.sha256}
            </p>
          )}
          {!!media.duplicateCount && (
            <Alert tone="amber" className="mt-4">
              This original hash also appears on {media.duplicateCount} other
              evidence item(s). This is a review signal, not a finding about
              intent.
            </Alert>
          )}
          {reviewUrl && media.processingStatus === "review_ready" ? (
            <div className="mt-4">
              {!openMedia ? (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setOpenMedia(true)}
                >
                  Open private review media
                </Button>
              ) : media.mediaKind === "video" ? (
                <video
                  controls
                  preload="metadata"
                  playsInline
                  src={reviewUrl}
                  poster={thumbnail}
                  className="max-h-[420px] w-full bg-graphite"
                  aria-label="Private review video"
                />
              ) : (
                <img
                  src={reviewUrl}
                  alt="Private evidence review derivative"
                  className="max-h-[420px] w-full bg-graphite object-contain"
                />
              )}
            </div>
          ) : (
            <p className="mt-4 text-xs leading-6 text-muted">
              {media.processingStatus === "failed"
                ? "Private media processing failed. This attachment cannot be published."
                : "Review media will be available after private processing completes."}
            </p>
          )}
          {originalUrl && (
            <a
              href={originalUrl}
              className="mt-4 inline-flex min-h-10 items-center text-xs font-medium underline underline-offset-4"
            >
              Download private original (administrator)
            </a>
          )}
          <p className="mt-4 text-[11px] leading-6 text-muted">
            Review copies are private and retain their own identity. Metadata
            removal does not obscure identifying visual or audio content.
          </p>
        </div>
      ) : (
        <p className="mt-6 border-t border-line pt-5 text-xs text-muted">
          Text-only observation. No private media is attached.
        </p>
      )}
    </section>
  );
}
