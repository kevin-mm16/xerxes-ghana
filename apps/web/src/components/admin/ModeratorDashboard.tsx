"use client";
import {
  Alert,
  Badge,
  Button,
  EmptyState,
  Icon,
  Metric,
  Skeleton,
} from "@/components/ui";
import { useModerationWorkspace } from "@/hooks/useModerationWorkspace";
import { ModerationQueue } from "./ModerationQueue";
import { ReviewWorkspace } from "./ReviewWorkspace";
export function ModeratorDashboard() {
  const {
    session,
    queue,
    loading,
    loadError,
    selectedId,
    detail,
    detailLoading,
    detailError,
    mobileView,
    busy,
    feedback,
    actionError,
    feedbackRef,
    setAttempt,
    setDetailAttempt,
    setMobileView,
    setSelectedId,
    onAction,
    more,
    logout,
    refreshQueue,
  } = useModerationWorkspace();
  if (loading)
    return (
      <div role="status" className="mx-auto max-w-[1600px] space-y-5 p-6">
        <p className="text-xs text-muted">
          Verifying reviewer session and loading private queue…
        </p>
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  if (loadError)
    return (
      <div className="p-6">
        <Alert tone="amber" title="Reviewer workspace unavailable">
          {actionError || loadError}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setAttempt((value) => value + 1)}
            >
              Retry authenticated workspace
            </Button>
            {session && (
              <Button
                size="sm"
                variant="secondary"
                disabled={busy}
                onClick={() => void logout()}
              >
                Sign out
              </Button>
            )}
          </div>
        </Alert>
      </div>
    );
  if (!session)
    return (
      <p role="status" className="p-6 text-sm text-muted">
        Redirecting to reviewer sign-in…
      </p>
    );
  const pending = queue.items.filter(
    (item) => item.reviewStatus === "pending",
  ).length;
  const active = queue.items.filter(
    (item) => item.reviewStatus === "in_review",
  ).length;
  const published = queue.items.filter(
    (item) => item.publicationStatus === "published",
  ).length;
  return (
    <div className="mx-auto w-full min-w-0 max-w-[1600px] px-4 py-6 sm:px-6 lg:px-7">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
            Operations / Ghana
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">
            Observation review
          </h1>
          <p className="mt-2 text-xs leading-6 text-muted">
            Private citizen intake, deliberate review and controlled public
            publication.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Badge tone="green">Authenticated {session.reviewer.role}</Badge>
          <span className="max-w-48 truncate text-xs text-muted">
            {session.reviewer.username}
          </span>
          <Button
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={() => void refreshQueue()}
          >
            <Icon name="refresh" className="h-3.5 w-3.5" />
            Refresh queue
          </Button>
          <Button
            size="sm"
            variant="secondary"
            disabled={busy}
            onClick={() => void logout()}
          >
            Sign out
          </Button>
        </div>
      </header>
      <div className="mb-6 grid grid-cols-2 divide-x divide-line border-y border-line py-4 lg:grid-cols-4">
        <div className="px-4">
          <Metric
            label="Loaded / total queue"
            value={`${queue.items.length} / ${queue.total}`}
          />
        </div>
        <div className="px-4">
          <Metric label="Pending / loaded" value={pending} />
        </div>
        <div className="border-t border-line px-4 pt-4 lg:border-t-0 lg:pt-0">
          <Metric label="In review / loaded" value={active} />
        </div>
        <div className="border-t border-line px-4 pt-4 lg:border-t-0 lg:pt-0">
          <Metric label="Published / loaded" value={published} />
        </div>
      </div>
      <div
        role="group"
        aria-label="Workspace view"
        className="mb-4 grid grid-cols-2 gap-1 rounded-[5px] border border-line bg-[#e9ece5] p-1 lg:hidden"
      >
        <Button
          size="sm"
          variant="ghost"
          aria-pressed={mobileView === "queue"}
          className={mobileView === "queue" ? "bg-white" : ""}
          onClick={() => {
            setMobileView("queue");
            requestAnimationFrame(() =>
              document.getElementById("queue-heading")?.focus(),
            );
          }}
        >
          Queue ({queue.items.length})
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={!selectedId}
          aria-pressed={mobileView === "review"}
          className={mobileView === "review" ? "bg-white" : ""}
          onClick={() => setMobileView("review")}
        >
          Review observation
        </Button>
      </div>
      {(feedback || actionError) && (
        <div ref={feedbackRef} tabIndex={-1} className="mb-4">
          <Alert tone={actionError ? "red" : "green"}>
            {actionError || feedback}
          </Alert>
        </div>
      )}
      <div className="grid min-w-0 overflow-hidden rounded-[6px] border border-line bg-[#fbfcf8] lg:grid-cols-[minmax(280px,.55fr)_minmax(0,1fr)]">
        <div
          className={`${mobileView === "queue" ? "block" : "hidden"} min-w-0 border-line lg:block lg:border-r`}
        >
          <ModerationQueue
            items={queue.items}
            total={queue.total}
            selectedId={selectedId}
            busy={busy}
            hasMore={queue.hasMore}
            onMore={() => void more()}
            onSelect={(id) => {
              setSelectedId(id);
              setMobileView("review");
            }}
          />
        </div>
        <div
          className={`${mobileView === "review" ? "block" : "hidden"} min-w-0 lg:block`}
        >
          <div className="border-b border-line p-3 lg:hidden">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setMobileView("queue");
                requestAnimationFrame(() =>
                  document.getElementById("queue-heading")?.focus(),
                );
              }}
            >
              <Icon name="arrow-left" className="h-4 w-4" />
              Back to queue
            </Button>
          </div>
          {detailLoading ? (
            <div role="status" className="space-y-4 p-6">
              <p className="text-xs text-muted">
                Loading authorized private detail…
              </p>
              <Skeleton className="h-8 w-2/3" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : detailError ? (
            <div className="p-5">
              <Alert tone="amber" title="Private detail unavailable">
                {detailError}
                <Button
                  size="sm"
                  className="mt-3"
                  onClick={() => setDetailAttempt((value) => value + 1)}
                >
                  Retry private record
                </Button>
              </Alert>
            </div>
          ) : detail ? (
            <ReviewWorkspace
              key={detail.id}
              observation={detail}
              session={session}
              busy={busy}
              onAction={onAction}
              onRefresh={() => setDetailAttempt((value) => value + 1)}
            />
          ) : (
            <EmptyState
              title="Select an observation"
              description="Private capture information and review media load only after you open a record."
              icon="file"
            />
          )}
        </div>
      </div>
      <p className="mt-4 text-[10px] leading-5 text-muted">
        Private originals, review copies and public derivatives have separate
        access boundaries. No automated mining classification is performed.
      </p>
    </div>
  );
}
