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
  };
}
export interface MapFeatureCollection {
  type: "FeatureCollection";
  features: MapApiFeature[];
  truncated: boolean;
}
export interface ObservationInput {
  title?: string;
  description: string;
  observedAt: string;
  captureLocation?: CaptureLocation;
  manualLocation?: string;
  mediaType: "none";
  anonymous: boolean;
  consent: true;
}
export interface SubmissionReceipt {
  id: string;
  status: "pending";
  submittedAt: string;
  coverageState: string;
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
