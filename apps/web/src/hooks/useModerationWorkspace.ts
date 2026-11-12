"use client";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  getReviewDetail,
  getReviewerSession,
  getReviewQueue,
  logoutReviewer,
  ReviewerRequestError,
} from "@/services/moderation";
import type {
  ModerationObservation,
  QueueObservation,
  QueueResponse,
  ReviewerSession,
} from "@/types/moderation";
import type { ReviewAction } from "@/components/admin/ReviewWorkspace";
function queueItem(detail: ModerationObservation): QueueObservation {
  return {
    id: detail.id,
    title: detail.title,
    submittedAt: detail.submittedAt,
    observedAt: detail.observedAt,
    coverageState: detail.coverageState,
    coverageRegion: detail.coverageRegion,
    reviewStatus: detail.reviewStatus,
    publicationStatus: detail.publicationStatus,
    assignee: detail.assignee,
    riskFlags: detail.riskFlags,
    media: detail.media
      ? {
          id: detail.media.id,
          processingStatus: detail.media.processingStatus,
          mediaKind: detail.media.mediaKind,
        }
      : null,
  };
}
const emptyQueue: QueueResponse = { items: [], total: 0, hasMore: false };
export function useModerationWorkspace() {
  const router = useRouter();
  const [session, setSession] = useState<ReviewerSession>();
  const [queue, setQueue] = useState<QueueResponse>(emptyQueue);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [selectedId, setSelectedId] = useState<string>();
  const [detail, setDetail] = useState<ModerationObservation>();
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState("");
  const [detailAttempt, setDetailAttempt] = useState(0);
  const [mobileView, setMobileView] = useState<"queue" | "review">("queue");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [actionError, setActionError] = useState("");
  const feedbackRef = useRef<HTMLDivElement>(null);
  const firstDetail = useRef<string | undefined>(undefined);
  const recordGeneration = useRef(0);

  const expire = useCallback(() => {
    setSession(undefined);
    setDetail(undefined);
    setQueue(emptyQueue);
    router.replace("/moderator/login");
  }, [router]);
  const handleFailure = useCallback(
    (reason: unknown, fallback: (message: string) => void) => {
      if (reason instanceof ReviewerRequestError && reason.status === 401) {
        expire();
        return;
      }
      if (reason instanceof DOMException && reason.name === "AbortError")
        return;
      fallback(
        reason instanceof Error
          ? reason.message
          : "The reviewer request failed. Please retry.",
      );
    },
    [expire],
  );
  const updateDetail = useCallback((value: ModerationObservation) => {
    setDetail(value);
    setQueue((current) => ({
      ...current,
      items: current.items.map((item) =>
        item.id === value.id ? queueItem(value) : item,
      ),
    }));
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setLoadError("");
    void (async () => {
      try {
        const identity = await getReviewerSession(controller.signal);
        if (controller.signal.aborted) return;
        setSession(identity);
        const data = await getReviewQueue(controller.signal);
        if (!controller.signal.aborted) setQueue(data);
      } catch (reason) {
        if (!controller.signal.aborted) handleFailure(reason, setLoadError);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [attempt, handleFailure]);
  useEffect(() => {
    if (!session) return;
    const remaining = Date.parse(session.expiresAt) - Date.now();
    const timer = setTimeout(expire, Math.max(0, remaining));
    return () => clearTimeout(timer);
  }, [session, expire]);
  useEffect(() => {
    if (!selectedId || !session) return;
    recordGeneration.current++;
    const controller = new AbortController();
    setDetailLoading(true);
    setDetailError("");
    setDetail(undefined);
    setActionError("");
    setFeedback("");
    void getReviewDetail(selectedId, controller.signal)
      .then((value) => {
        if (!controller.signal.aborted) updateDetail(value);
      })
      .catch((reason) => {
        if (!controller.signal.aborted) handleFailure(reason, setDetailError);
      })
      .finally(() => {
        if (!controller.signal.aborted) setDetailLoading(false);
      });
    return () => controller.abort();
  }, [selectedId, detailAttempt, session, handleFailure, updateDetail]);
  const waiting =
    !!detail &&
    (["quarantined", "processing"].includes(
      detail.media?.processingStatus ?? "",
    ) ||
      ["queued", "processing"].includes(
        detail.publicMedia?.processingStatus ?? "",
      ));
  useEffect(() => {
    if (!waiting || !detail) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    const identifier = detail.id;
    async function poll() {
      try {
        const generation = recordGeneration.current;
        const value = await getReviewDetail(identifier, controller.signal);
        if (controller.signal.aborted) return;
        if (generation !== recordGeneration.current) {
          timer = setTimeout(poll, 2500);
          return;
        }
        updateDetail(value);
        if (
          ["quarantined", "processing"].includes(
            value.media?.processingStatus ?? "",
          ) ||
          ["queued", "processing"].includes(
            value.publicMedia?.processingStatus ?? "",
          )
        )
          timer = setTimeout(poll, 2500);
      } catch (reason) {
        if (!controller.signal.aborted) handleFailure(reason, setActionError);
      }
    }
    timer = setTimeout(poll, 2500);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [waiting, detail?.id, handleFailure, updateDetail]);
  useEffect(() => {
    if (detail && firstDetail.current !== detail.id) {
      firstDetail.current = detail.id;
      document.getElementById("review-heading")?.focus();
    }
  }, [detail]);
  useEffect(() => {
    if (actionError || feedback) feedbackRef.current?.focus();
  }, [actionError, feedback]);

  const onAction: ReviewAction = async (task, success) => {
    if (busy) return;
    setBusy(true);
    recordGeneration.current++;
    setActionError("");
    setFeedback("");
    try {
      const value = await task();
      recordGeneration.current++;
      updateDetail(value);
      setFeedback(success);
    } catch (reason) {
      handleFailure(reason, setActionError);
    } finally {
      recordGeneration.current++;
      setBusy(false);
    }
  };
  async function more() {
    if (busy) return;
    setBusy(true);
    try {
      const next = await getReviewQueue(undefined, queue.items.length);
      setQueue((current) => ({
        ...next,
        items: [
          ...current.items,
          ...next.items.filter(
            (item) =>
              !current.items.some((existing) => existing.id === item.id),
          ),
        ],
      }));
    } catch (reason) {
      handleFailure(reason, setActionError);
    } finally {
      setBusy(false);
    }
  }
  async function logout() {
    if (!session || busy) return;
    setBusy(true);
    try {
      await logoutReviewer(session.csrfToken);
      expire();
    } catch (reason) {
      handleFailure(reason, setActionError);
    } finally {
      setBusy(false);
    }
  }

  async function refreshQueue() {
    if (busy) return;
    setBusy(true);
    try {
      setQueue(await getReviewQueue());
    } catch (reason) {
      handleFailure(reason, setActionError);
    } finally {
      setBusy(false);
    }
  }

  return {
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
  };
}
