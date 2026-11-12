import type { IntelligenceGeometry as GeoJsonGeometry } from "./intelligence";

export interface ReviewerIdentity {
  id: string;
  username: string;
  role: "moderator" | "admin";
}
export interface ReviewerSession {
  authenticated: true;
  reviewer: ReviewerIdentity;
  csrfToken: string;
  expiresAt: string;
}
export type ReviewStatus = "pending" | "in_review" | "approved" | "rejected";
export type PublicationStatus = "not_published" | "published" | "withdrawn";
export type MediaDecision = "undecided" | "exclude" | "publish";
export type PublicLocationPolicy = "grid" | "coverage_region";
export interface PrivacyChecklist {
  summaryReviewed: boolean;
  locationReviewed: boolean;
  identifiersClear: boolean;
}
export interface QueueObservation {
  id: string;
  title?: string | null;
  submittedAt: string;
  observedAt: string;
  coverageState: string;
  coverageRegion: { id: string; code: string; name: string } | null;
  media: {
    id: string;
    processingStatus: string;
    mediaKind: "image" | "video";
  } | null;
  reviewStatus: ReviewStatus;
  publicationStatus: PublicationStatus;
  assignee: { id: string; username: string } | null;
  riskFlags: string[];
}
export interface PrivateMedia {
  id: string;
  processingStatus: string;
  mediaKind: "image" | "video";
  mimeType?: string | null;
  filename?: string | null;
  fileSize?: number | null;
  sha256?: string | null;
  duplicateCount?: number;
  reviewUrl?: string | null;
  thumbnailUrl?: string | null;
  originalUrl?: string | null;
}
export interface PublicDerivative {
  id: string;
  processingStatus: string;
  mediaKind: "image" | "video";
  errorCode?: string | null;
}
export interface ModerationObservation extends Omit<QueueObservation, "media"> {
  privateDescription: string;
  manualLocation?: string | null;
  captureLocation: {
    latitude: number;
    longitude: number;
    accuracyMeters: number;
    capturedAt: string;
    source: string;
  } | null;
  observationLocation: {
    geometry: GeoJsonGeometry;
    reviewedAt: string;
    reviewedBy: string;
  } | null;
  sanitizedTitle: string;
  sanitizedSummary: string;
  mediaDecision: MediaDecision;
  publicLocationPolicy: PublicLocationPolicy;
  privacyChecklist: PrivacyChecklist;
  media: PrivateMedia | null;
  publicMedia: PublicDerivative | null;
  audit: Array<{
    id: string;
    action: string;
    reviewerId: string;
    createdAt: string;
    details: Record<string, unknown>;
    note?: string | null;
  }>;
}
export interface QueueResponse {
  items: QueueObservation[];
  total: number;
  hasMore: boolean;
}
export interface PublicLocationPreview {
  geometry: GeoJsonGeometry;
  label: string;
  precisionLevel: string;
  policy: PublicLocationPolicy;
}
export interface PublicationDraft {
  sanitizedTitle: string;
  sanitizedSummary: string;
  mediaDecision: MediaDecision;
  publicLocationPolicy: PublicLocationPolicy;
  privacyChecklist: PrivacyChecklist;
}
