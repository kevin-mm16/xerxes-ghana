"use client";
import type { ModerationObservation } from "@/types/moderation";
import type { ReviewAction } from "./ReviewWorkspace";
import { PublicDraftEditor } from "./PublicDraftEditor";
import { PublicMediaPreparation } from "./PublicMediaPreparation";
import { ReviewPublicationDecision } from "./ReviewPublicationDecision";
export interface PublicationEditorProps {
  observation: ModerationObservation;
  csrfToken: string;
  busy: boolean;
  editable: boolean;
  canAct: boolean;
  onAction: ReviewAction;
}
export function PublicationEditor(props: PublicationEditorProps) {
  return (
    <>
      <PublicDraftEditor {...props} />
      <PublicMediaPreparation {...props} />
      <ReviewPublicationDecision {...props} />
    </>
  );
}
