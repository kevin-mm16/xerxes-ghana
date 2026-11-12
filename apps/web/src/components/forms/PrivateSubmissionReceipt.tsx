"use client";

import { useEffect, useRef } from "react";
import { Alert, Badge, Button, Icon, SectionLabel } from "@/components/ui";
import { mediaFailureMessage } from "@/services/uploads";
import type { SubmissionReceipt, UploadStatus } from "@/types/api";

export function PrivateSubmissionReceipt({
  receipt,
  mediaStatus,
  statusMessage,
  onCheck,
}: {
  receipt: SubmissionReceipt;
  mediaStatus?: UploadStatus;
  statusMessage: string;
  onCheck: () => void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus(), []);
  const failed =
    mediaStatus && ["failed", "expired"].includes(mediaStatus.processingStatus);
  return (
    <section
      role="status"
      className="mx-auto max-w-3xl border-y border-line py-9 sm:py-12"
      aria-labelledby="receipt-title"
    >
      <div className="mb-6 flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-forest-50 text-forest-600">
          <Icon name="check" className="h-5 w-5" />
        </span>
        <Badge tone="green">Pending private review</Badge>
      </div>
      <SectionLabel>Observation received</SectionLabel>
      <h2
        ref={heading}
        tabIndex={-1}
        id="receipt-title"
        className="mt-3 text-2xl font-semibold tracking-tight outline-none sm:text-3xl"
      >
        Saved for private review
      </h2>
      <p className="mt-3 max-w-xl text-sm leading-7 text-muted">
        Your observation is pending review. Nothing has been published.
      </p>
      {mediaStatus && (
        <div className="mt-6" data-testid="media-processing-status">
          <Alert
            tone={failed ? "amber" : "neutral"}
            title={
              mediaStatus.processingStatus === "review_ready"
                ? "Evidence prepared"
                : failed
                  ? "Evidence needs attention"
                  : "Preparing evidence"
            }
          >
            {mediaStatus.processingStatus === "review_ready"
              ? "Your file has been processed and is ready for private review."
              : failed
                ? mediaFailureMessage(mediaStatus)
                : "Your file is stored privately and is being prepared for review."}
          </Alert>
        </div>
      )}
      {statusMessage && (
        <div className="mt-4 text-sm leading-6 text-muted">
          <p>{statusMessage}</p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="mt-3"
            onClick={onCheck}
          >
            Check processing status
          </Button>
        </div>
      )}
      <div className="mt-8 border-t border-line pt-6">
        <SectionLabel>Your reference</SectionLabel>
        <p className="mt-2 break-all font-mono text-sm">{receipt.id}</p>
        <p className="mt-3 max-w-xl text-xs leading-6 text-muted">
          Keep this reference. Public lookup becomes available only if a
          sanitized record is approved. This receipt does not mean the
          observation has been verified.
        </p>
      </div>
    </section>
  );
}
