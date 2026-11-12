import type {
  ModerationObservation,
  PublicationDraft,
  PublicLocationPreview,
  QueueResponse,
  ReviewerSession,
} from "@/types/moderation";

export class ReviewerRequestError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api/v1${path}`, {
      ...options,
      credentials: "same-origin",
      cache: "no-store",
      signal: options.signal ?? AbortSignal.timeout(20000),
      headers: { "Content-Type": "application/json", ...options.headers },
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError")
      throw error;
    throw new ReviewerRequestError(
      "The reviewer service is unavailable. Please retry.",
      503,
    );
  }
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ReviewerRequestError(
      typeof body?.detail === "string"
        ? body.detail
        : "The reviewer request could not be completed.",
      response.status,
    );
  }
  return response.status === 204
    ? (undefined as T)
    : (response.json() as Promise<T>);
}
const post = <T>(path: string, csrfToken: string, body: unknown = {}) =>
  request<T>(path, {
    method: "POST",
    headers: { "X-CSRF-Token": csrfToken },
    body: JSON.stringify(body),
  });
export const getReviewerSession = (signal?: AbortSignal) =>
  request<ReviewerSession>("/auth/session", { signal });
export const loginReviewer = (username: string, password: string) =>
  request<ReviewerSession>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
export const logoutReviewer = (csrfToken: string) =>
  post<void>("/auth/logout", csrfToken);
export const getReviewQueue = (signal?: AbortSignal, offset = 0) =>
  request<QueueResponse>(`/moderation/observations?limit=50&offset=${offset}`, {
    signal,
  });
export const getReviewDetail = (id: string, signal?: AbortSignal) =>
  request<ModerationObservation>(`/moderation/observations/${id}`, { signal });
export const getPublicLocationPreview = (id: string, signal?: AbortSignal) =>
  request<PublicLocationPreview>(
    `/moderation/observations/${id}/public-location`,
    { signal },
  );
export const assignReview = (id: string, csrfToken: string) =>
  post<ModerationObservation>(
    `/moderation/observations/${id}/assign`,
    csrfToken,
  );
export const saveReviewedLocation = (
  id: string,
  csrfToken: string,
  longitude: number,
  latitude: number,
  reason: string,
) =>
  post<ModerationObservation>(
    `/moderation/observations/${id}/location`,
    csrfToken,
    { geometry: { type: "Point", coordinates: [longitude, latitude] }, reason },
  );
export const savePublicationDraft = (
  id: string,
  csrfToken: string,
  draft: PublicationDraft,
) =>
  post<ModerationObservation>(
    `/moderation/observations/${id}/draft`,
    csrfToken,
    draft,
  );
export const decideReview = (
  id: string,
  csrfToken: string,
  decision: "approve" | "reject",
  reason?: string,
) =>
  post<ModerationObservation>(
    `/moderation/observations/${id}/decision`,
    csrfToken,
    { decision, reason },
  );
export const preparePublicMedia = (id: string, csrfToken: string) =>
  post<ModerationObservation>(
    `/moderation/observations/${id}/prepare-media`,
    csrfToken,
  );
export const publishObservation = (id: string, csrfToken: string) =>
  post<ModerationObservation>(
    `/moderation/observations/${id}/publish`,
    csrfToken,
  );
export const withdrawObservation = (
  id: string,
  csrfToken: string,
  reason?: string,
) =>
  post<ModerationObservation>(
    `/moderation/observations/${id}/withdraw`,
    csrfToken,
    { reason },
  );
