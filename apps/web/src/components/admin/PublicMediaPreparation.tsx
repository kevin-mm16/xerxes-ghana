"use client";
import { Alert, Badge, Button } from "@/components/ui";
import { preparePublicMedia } from "@/services/moderation";
import type { PublicationEditorProps } from "./PublicationEditor";
export function PublicMediaPreparation({
  observation,
  csrfToken,
  busy,
  editable,
  onAction,
}: PublicationEditorProps) {
  if (!observation.media) return null;
  return (
    <section
      aria-labelledby="public-media-heading"
      className="border-b border-line p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 id="public-media-heading" className="text-sm font-semibold">
          Public media preparation
        </h3>
        {observation.publicMedia && (
          <Badge
            tone={
              observation.publicMedia.processingStatus === "ready"
                ? "green"
                : observation.publicMedia.processingStatus === "failed"
                  ? "red"
                  : "amber"
            }
          >
            {observation.publicMedia.processingStatus}
          </Badge>
        )}
      </div>
      <p className="mt-3 text-xs leading-6 text-muted">
        Create a distinct normalized derivative from the private review media.
        Its bytes are inaccessible to the public until the observation is
        published.
      </p>
      {observation.publicMedia?.processingStatus === "failed" && (
        <Alert tone="red" className="mt-4">
          Public processing failed
          {observation.publicMedia.errorCode
            ? ` (${observation.publicMedia.errorCode})`
            : ""}
          . Correct the issue before retrying or exclude this media.
        </Alert>
      )}
      <Button
        size="sm"
        variant="secondary"
        className="mt-4"
        disabled={
          busy ||
          !editable ||
          observation.mediaDecision !== "publish" ||
          !observation.privacyChecklist.identifiersClear ||
          observation.media.processingStatus !== "review_ready" ||
          ["queued", "processing"].includes(
            observation.publicMedia?.processingStatus ?? "",
          )
        }
        onClick={() =>
          void onAction(
            () => preparePublicMedia(observation.id, csrfToken),
            "Public derivative preparation requested. This does not publish the observation.",
          )
        }
      >
        {observation.publicMedia?.processingStatus === "failed"
          ? "Retry public derivative"
          : "Prepare public derivative"}
      </Button>
      <p className="mt-3 text-[11px] leading-6 text-muted">
        Preparation requires a saved media decision and identifier
        certification. Processing status updates while this record is open.
      </p>
    </section>
  );
}
