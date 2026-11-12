"use client";
import { useState } from "react";
import { Alert, Button, Field, Textarea } from "@/components/ui";
import {
  decideReview,
  publishObservation,
  withdrawObservation,
} from "@/services/moderation";
import type { PublicationEditorProps } from "./PublicationEditor";
export function ReviewPublicationDecision({
  observation,
  csrfToken,
  busy,
  editable,
  canAct,
  onAction,
}: PublicationEditorProps) {
  const [note, setNote] = useState("");
  const published = observation.publicationStatus === "published";
  return (
    <section
      aria-labelledby="publication-decision-heading"
      className="p-5 sm:p-6"
    >
      <h3 id="publication-decision-heading" className="text-sm font-semibold">
        Review and publication decision
      </h3>
      <p className="mt-3 text-xs leading-6 text-muted">
        Approval and publication are separate audited actions. Publication
        checks the saved summary, reviewed location, privacy checklist and media
        decision on the server.
      </p>
      <div className="mt-5">
        <Field
          label="Decision note (private)"
          help="Keep this brief. Do not add source identifiers."
        >
          <Textarea
            rows={2}
            className="min-h-[80px]"
            value={note}
            maxLength={1000}
            disabled={busy || !canAct}
            onChange={(event) => setNote(event.target.value)}
          />
        </Field>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <Button
          size="sm"
          disabled={
            busy || !editable || observation.reviewStatus === "approved"
          }
          onClick={() =>
            void onAction(
              () =>
                decideReview(
                  observation.id,
                  csrfToken,
                  "approve",
                  note || undefined,
                ),
              "Observation approved for the saved publication draft. Publish is a separate action.",
            )
          }
        >
          Approve observation
        </Button>
        <Button
          size="sm"
          variant="secondary"
          disabled={
            busy || !editable || observation.reviewStatus === "rejected"
          }
          onClick={() =>
            void onAction(
              () =>
                decideReview(
                  observation.id,
                  csrfToken,
                  "reject",
                  note || undefined,
                ),
              "Observation rejected. It remains private.",
            )
          }
        >
          Reject observation
        </Button>
        <Button
          size="sm"
          disabled={
            busy ||
            !canAct ||
            published ||
            observation.reviewStatus !== "approved"
          }
          onClick={() =>
            void onAction(
              () => publishObservation(observation.id, csrfToken),
              "Observation published with its sanitized public summary, safe location and approved media decision.",
            )
          }
        >
          Publish observation
        </Button>
        {published && (
          <Button
            size="sm"
            variant="danger"
            disabled={busy || !canAct}
            onClick={() =>
              void onAction(
                () =>
                  withdrawObservation(
                    observation.id,
                    csrfToken,
                    note || undefined,
                  ),
                "Publication withdrawn. Public map, record and media delivery are blocked; private evidence and audit history are retained.",
              )
            }
          >
            Withdraw publication
          </Button>
        )}
      </div>
      {published && (
        <Alert tone="green" className="mt-5">
          This observation is publicly available. Withdraw it before changing
          the reviewed geography or public draft.
        </Alert>
      )}
    </section>
  );
}
