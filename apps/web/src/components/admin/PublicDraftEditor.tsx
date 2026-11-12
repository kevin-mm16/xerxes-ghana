"use client";

import { useEffect, useState } from "react";
import { PublicLocationMap } from "@/components/evidence/PublicLocationMap";
import {
  Alert,
  Badge,
  Button,
  Field,
  Input,
  Select,
  Textarea,
} from "@/components/ui";
import {
  getPublicLocationPreview,
  savePublicationDraft,
} from "@/services/moderation";
import type {
  PublicationDraft,
  PublicLocationPreview,
} from "@/types/moderation";
import type { PublicationEditorProps } from "./PublicationEditor";
import { PublicationPrivacyChecklist } from "./PublicationPrivacyChecklist";

export function PublicDraftEditor({
  observation,
  csrfToken,
  busy,
  editable,
  onAction,
}: PublicationEditorProps) {
  const [draft, setDraft] = useState<PublicationDraft>({
    sanitizedTitle: observation.sanitizedTitle,
    sanitizedSummary: observation.sanitizedSummary,
    mediaDecision: observation.mediaDecision,
    publicLocationPolicy: observation.publicLocationPolicy,
    privacyChecklist: observation.privacyChecklist,
  });
  const [preview, setPreview] = useState<PublicLocationPreview>();
  const [previewError, setPreviewError] = useState("");
  const [previewBusy, setPreviewBusy] = useState(false);
  useEffect(() => {
    setDraft({
      sanitizedTitle: observation.sanitizedTitle,
      sanitizedSummary: observation.sanitizedSummary,
      mediaDecision: observation.mediaDecision,
      publicLocationPolicy: observation.publicLocationPolicy,
      privacyChecklist: observation.privacyChecklist,
    });
    setPreview(undefined);
  }, [
    observation.id,
    observation.sanitizedTitle,
    observation.sanitizedSummary,
    observation.mediaDecision,
    observation.publicLocationPolicy,
    observation.privacyChecklist.summaryReviewed,
    observation.privacyChecklist.locationReviewed,
    observation.privacyChecklist.identifiersClear,
  ]);
  async function showPreview() {
    setPreviewError("");
    setPreviewBusy(true);
    try {
      setPreview(await getPublicLocationPreview(observation.id));
    } catch (reason) {
      setPreviewError(
        reason instanceof Error
          ? reason.message
          : "Public location could not be generated.",
      );
    } finally {
      setPreviewBusy(false);
    }
  }
  return (
    <section
      id="publication-draft"
      aria-labelledby="public-draft-heading"
      className="border-b border-line p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 id="public-draft-heading" className="text-sm font-semibold">
          Sanitized public draft
        </h3>
        <Badge tone="neutral">Separate from private intake</Badge>
      </div>
      <p className="mt-3 text-xs leading-6 text-muted">
        Write a new public summary. Do not copy identifying source details,
        exact capture coordinates or private notes. Save the draft before
        generating its location preview or preparing public media.
      </p>
      <fieldset disabled={busy || !editable} className="mt-5 min-w-0 space-y-4">
        <Field label="Sanitized public title" required>
          <Input
            value={draft.sanitizedTitle}
            maxLength={160}
            onChange={(event) =>
              setDraft({ ...draft, sanitizedTitle: event.target.value })
            }
          />
        </Field>
        <Field label="Sanitized public summary" required>
          <Textarea
            value={draft.sanitizedSummary}
            maxLength={5000}
            onChange={(event) =>
              setDraft({ ...draft, sanitizedSummary: event.target.value })
            }
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Public media decision" required>
            <Select
              value={draft.mediaDecision}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  mediaDecision: event.target
                    .value as PublicationDraft["mediaDecision"],
                })
              }
            >
              <option value="undecided">Choose an explicit decision</option>
              <option value="exclude">Publish text only / exclude media</option>
              {observation.media && (
                <option value="publish">Prepare sanitized public media</option>
              )}
            </Select>
          </Field>
          <Field label="Public geographic policy" required>
            <Select
              value={draft.publicLocationPolicy}
              onChange={(event) =>
                setDraft({
                  ...draft,
                  publicLocationPolicy: event.target
                    .value as PublicationDraft["publicLocationPolicy"],
                })
              }
            >
              <option value="grid">Generalized reviewed grid cell</option>
              <option value="coverage_region">
                Whole monitoring region — higher protection
              </option>
            </Select>
          </Field>
        </div>
        <PublicationPrivacyChecklist
          value={draft.privacyChecklist}
          onChange={(privacyChecklist) =>
            setDraft({ ...draft, privacyChecklist })
          }
        />
        <Button
          size="sm"
          onClick={() =>
            void onAction(
              () => savePublicationDraft(observation.id, csrfToken, draft),
              "Public draft saved privately. Nothing has been published.",
            )
          }
        >
          Save public draft
        </Button>
      </fieldset>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button
          size="sm"
          variant="secondary"
          disabled={busy || previewBusy || !observation.observationLocation}
          onClick={() => void showPreview()}
        >
          {previewBusy ? "Generating preview…" : "Preview safe public location"}
        </Button>
        <span className="text-[10px] text-muted">
          Uses the saved reviewed location and policy.
        </span>
      </div>
      {previewError && (
        <Alert tone="amber" className="mt-4">
          {previewError}
        </Alert>
      )}
      {preview && (
        <div className="mt-5">
          <p className="mb-3 text-xs font-medium">
            {preview.label} · {preview.precisionLevel.replaceAll("_", " ")}
          </p>
          <PublicLocationMap
            geometry={preview.geometry}
            label={preview.label}
          />
          <p className="mt-3 text-[11px] leading-6 text-muted">
            Generalized activity geography. This preview does not expose the
            original capture point.
          </p>
        </div>
      )}
    </section>
  );
}
