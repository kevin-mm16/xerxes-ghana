import { mockAiFeatures, mockCoverageFeatures, mockSatelliteFeatures } from "@/data/mockIntelligence";
import { mockReports } from "@/data/mockReports";
import type { Report } from "@/types";
import type { IntelligenceFeature } from "@/types/intelligence";

/**
 * Temporary frontend adapter.
 *
 * Components should consume this service instead of importing mock fixtures
 * directly. The implementation can later switch to /api/v1/map/features
 * without changing the map UI.
 */
export function getMapReports(): Report[] {
  return mockReports;
}

export function getMapFeatures(): IntelligenceFeature[] {
  const observations: IntelligenceFeature[] = mockReports.map((report) => ({
    id: `observation-${report.id}`,
    type: report.mediaType === "Video" ? "approved_video" : "citizen_observation",
    observedAt: report.dateObserved,
    geometry: {
      type: "Point",
      coordinates: [
        report.publicCoordinatesApproximate.lng,
        report.publicCoordinatesApproximate.lat,
      ],
    },
    properties: {
      title: report.title,
      layer: "observations",
      source: report.verificationSource,
      region: report.region,
      district: report.district,
      summary: report.description,
      category: report.mediaType === "Video" ? "Approved video observation" : "Public observation",
      confidence: report.evidenceConfidenceScore,
      severity: report.severity,
      status: report.status,
      mediaType: report.mediaType,
      reportId: report.id,
      publicLabel: report.approximateLocationLabel,
    },
  }));

  return [
    ...mockCoverageFeatures,
    ...observations,
    ...mockAiFeatures,
    ...mockSatelliteFeatures,
  ];
}
