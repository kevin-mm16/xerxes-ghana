import type { MediaType, ReportStatus, SeverityLevel } from "@/types";

export type MapLayerKey = "coverage" | "observations" | "ai" | "satellite";
export type BaseMapKey = "satellite" | "vegetation" | "streets";

export type IntelligenceFeatureType =
  | "coverage_region"
  | "citizen_observation"
  | "approved_video"
  | "ai_candidate"
  | "satellite_change";

export interface GeoPointGeometry {
  type: "Point";
  coordinates: [number, number];
}

export interface GeoPolygonGeometry {
  type: "Polygon";
  coordinates: Array<Array<[number, number]>>;
}

export type IntelligenceGeometry = GeoPointGeometry | GeoPolygonGeometry;

export interface IntelligenceFeatureProperties {
  title: string;
  layer: MapLayerKey;
  source: string;
  region?: string;
  district?: string;
  summary?: string;
  category?: string;
  confidence?: number;
  severity?: SeverityLevel;
  status?: ReportStatus;
  mediaType?: MediaType;
  reportId?: string;
  publicLabel?: string;
  modelVersion?: string;
}

export interface IntelligenceFeature {
  id: string;
  type: IntelligenceFeatureType;
  geometry: IntelligenceGeometry;
  observedAt?: string;
  properties: IntelligenceFeatureProperties;
}

export interface MapLayerState {
  coverage: boolean;
  observations: boolean;
  ai: boolean;
  satellite: boolean;
}
