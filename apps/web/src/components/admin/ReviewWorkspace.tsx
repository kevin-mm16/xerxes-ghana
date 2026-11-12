"use client";

import AppLink from "next/link";
import { Badge, Button, Icon, SectionLabel } from "@/components/ui";
import { assignReview } from "@/services/moderation";
import type {
  ModerationObservation,
  ReviewerSession,
} from "@/types/moderation";
import { ReviewEvidence } from "./ReviewEvidence";
import { ReviewedLocationEditor } from "./ReviewedLocationEditor";
import { PublicationEditor } from "./PublicationEditor";

export type ReviewAction = (
  task: () => Promise<ModerationObservation>,
  success: string,
) => Promise<void>;
export function ReviewWorkspace({
  observation,
  session,
  busy,
  onAction,
  onRefresh,
}: {
  observation: ModerationObservation;
  session: ReviewerSession;
  busy: boolean;
  onAction: ReviewAction;
  onRefresh: () => void;
}) {
  const canAct =
    session.reviewer.role === "admin" ||
    observation.assignee?.id === session.reviewer.id;
  const editable = canAct && observation.publicationStatus !== "published";
  return (
    <article id="review-workspace" className="min-w-0">
      <header className="border-b border-line p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SectionLabel className="break-all font-mono text-[9px]">
            {observation.id}
          </SectionLabel>
          <div className="flex flex-wrap gap-2">
            <Badge
              tone={
                observation.reviewStatus === "approved"
                  ? "green"
                  : observation.reviewStatus === "rejected"
                    ? "red"
                    : "amber"
              }
            >
              {observation.reviewStatus.replaceAll("_", " ")}
            </Badge>
            <Badge
              tone={
                observation.publicationStatus === "published"
                  ? "green"
                  : "neutral"
              }
            >
              {observation.publicationStatus.replaceAll("_", " ")}
            </Badge>
          </div>
        </div>
        <h2
          id="review-heading"
          tabIndex={-1}
          className="mt-4 break-words text-xl font-semibold leading-snug tracking-tight"
        >
          {observation.title || "Untitled private observation"}
        </h2>
        <p className="mt-3 text-xs text-muted">
          {observation.assignee
            ? `Assigned to ${observation.assignee.username}`
            : "Unassigned — claim this observation before making review changes."}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="secondary"
            disabled={busy || observation.assignee?.id === session.reviewer.id}
            onClick={() =>
              void onAction(
                () => assignReview(observation.id, session.csrfToken),
                "Observation assigned to you. Review changes are now authorized.",
              )
            }
          >
            Assign to me
          </Button>
          <Button size="sm" variant="ghost" disabled={busy} onClick={onRefresh}>
            <Icon name="refresh" className="h-3.5 w-3.5" />
            Refresh record
          </Button>
          {observation.publicationStatus === "published" && (
            <AppLink
              href={`/reports/${observation.id}`}
              className="ui-button ui-button--secondary ui-button--small"
            >
              Open public record
              <Icon name="arrow-up-right" className="h-3.5 w-3.5" />
            </AppLink>
          )}
        </div>
      </header>
      <ReviewEvidence key={observation.id} observation={observation} />
      <ReviewedLocationEditor
        observation={observation}
        csrfToken={session.csrfToken}
        busy={busy}
        editable={editable}
        onAction={onAction}
      />
      <PublicationEditor
        observation={observation}
        csrfToken={session.csrfToken}
        busy={busy}
        editable={editable}
        canAct={canAct}
        onAction={onAction}
      />
      <section
        id="session-activity"
        aria-labelledby="review-audit-heading"
        className="border-t border-line p-5 sm:p-6"
      >
        <h3 id="review-audit-heading" className="text-sm font-semibold">
          Durable review activity
        </h3>
        <p className="mt-3 text-xs leading-6 text-muted">
          Server-recorded actions for this observation. Private text and
          credentials are excluded from the event summary.
        </p>
        {observation.audit.length ? (
          <ol className="mt-5 divide-y divide-line border-y border-line">
            {observation.audit.map((event) => (
              <li key={event.id} className="py-3">
                <p className="text-xs font-medium capitalize">
                  {event.action.replaceAll("_", " ")}
                </p>
                <p className="mt-1 break-all text-[10px] leading-5 text-muted">
                  {new Date(event.createdAt).toLocaleString()} · reviewer{" "}
                  {event.reviewerId}
                </p>
                {event.note && (
                  <p className="mt-2 whitespace-pre-line break-words text-xs leading-6 text-muted">
                    Reviewer note: {event.note.slice(0, 1000)}
                  </p>
                )}
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-5 text-xs text-muted">
            No review events recorded yet.
          </p>
        )}
      </section>
    </article>
  );
}
