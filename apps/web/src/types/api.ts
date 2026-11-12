import type {
  IntelligenceGeometry,
  IntelligenceFeatureType,
  MapLayerKey,
} from "./intelligence";

export interface CaptureLocation {
  latitude: number;
  longitude: number;
  accuracyMeters: number;
  capturedAt: string;
  source: "browser-geolocation" | "manual" | "drone";
}
export interface CoverageRegionRef {
  id: string;
  code: string;
  name: string;
  version: number;
  isDemo: boolean;
}
export interface CoverageResult {
  insideCoverage: boolean;
  state: "inside" | "outside" | "uncertain";
  boundaryAmbiguous: boolean;
  matchedRegions: CoverageRegionRef[];
  nearbyRegions: CoverageRegionRef[];
}
export interface MapApiFeature {
  type: "Feature";
  id: string;
  geometry: IntelligenceGeometry;
  properties: {
    featureType: IntelligenceFeatureType;
    layer: MapLayerKey;
    title: string;
    source: string;
    summary?: string;
    code?: string;
    version?: number;
    isDemo?: boolean;
    status?: string;
    publicLabel?: string;
    precisionLevel?: string;
    observedAt?: string;
    observationId?: string;
    modelVersion?: string;
    inferenceTimestamp?: string;
    confidence?: number;
    sourceImagery?: string[];
    reviewState?: string;
    sourceUrl?: string;
    datasetVersion?: string;
    boundaryLevel?: string;
    licenseNote?: string;
    region?: string;
    sourceDate?: string;
  };
}
export interface MapFeatureCollection {
  type: "FeatureCollection";
  features: MapApiFeature[];
  truncated: boolean;
}
export interface ObservationInput {
  submissionId?: string;
  title?: string;
  description: string;
  observedAt: string;
  captureLocation?: CaptureLocation;
  manualLocation?: string;
  mediaType: "none";
  anonymous: boolean;
  consent: true;
  media?: { uploadId: string; uploadToken: string };
}
export type MediaProcessingStatus =
  | "awaiting_upload"
  | "uploading"
  | "quarantined"
  | "processing"
  | "review_ready"
  | "failed"
  | "expired";
export interface UploadIntent {
  id: string;
  uploadToken: string;
  uploadUrl: string;
  expiresAt: string;
  maxBytes: number;
}
export interface UploadStatus {
  id: string;
  processingStatus: MediaProcessingStatus;
  mediaKind: "image" | "video";
  errorCode?: string | null;
}
export interface SubmissionReceipt {
  id: string;
  status: "pending";
  submittedAt: string;
  coverageState: string;
  media?: UploadStatus | null;
}
export interface PublicObservation {
  id: string;
  title: string;
  description: string;
  observedAt: string;
  status: "approved";
  publicLocation: IntelligenceGeometry;
  publicLabel: string;
  precisionLevel: string;
}
