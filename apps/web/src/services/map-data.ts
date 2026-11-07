import type { IntelligenceFeature } from "@/types/intelligence";
import type { MapApiFeature, MapFeatureCollection } from "@/types/api";
import { apiRequest } from "./api";

/** The renderer consumes this domain shape, independent of persistence or inference engines. */
export function adaptMapFeature(feature: MapApiFeature): IntelligenceFeature {
  const p = feature.properties;
  return {
    id: feature.id,
    type: p.featureType,
    geometry: feature.geometry,
    observedAt: p.observedAt,
    properties: {
      title: p.title,
      layer: p.layer,
      source: p.source,
      summary: p.summary,
      status: p.status === "approved" ? "Verified" : undefined,
      coverageCode: p.code,
      isDemo: p.isDemo,
      publicLabel: p.publicLabel,
      observationId: p.observationId,
      precisionLevel: p.precisionLevel,
      modelVersion: p.modelVersion,
      confidence: p.confidence,
      inferenceTimestamp: p.inferenceTimestamp,
      sourceImagery: p.sourceImagery,
      reviewState: p.reviewState,
    },
  };
}
export async function getMapFeatures(signal?: AbortSignal) {
  const collection = await apiRequest<MapFeatureCollection>(
    "/map/features?bbox=-3.5,4.3,1.5,11.3&layers=coverage,observations,ai,satellite",
    { signal },
  );
  if (
    collection.type !== "FeatureCollection" ||
    !Array.isArray(collection.features)
  ) {
    throw new Error("The map service returned an invalid response.");
  }
  return {
    features: collection.features.map(adaptMapFeature),
    truncated: collection.truncated,
  };
}
