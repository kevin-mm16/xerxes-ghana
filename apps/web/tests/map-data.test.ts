import { describe, expect, it, vi } from "vitest";
import { adaptMapFeature, getMapFeatures } from "@/services/map-data";
import { satelliteForYear } from "@/services/imagery";

describe("map domain boundary", () => {
  it("requests only observations for the evidence feed, preserving its service limit", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue({
        ok: true,
        json: async () => ({
          type: "FeatureCollection",
          features: [],
          truncated: false,
        }),
      });
    vi.stubGlobal("fetch", fetch);
    try {
      await getMapFeatures(undefined, "observations");
      expect(fetch.mock.calls[0][0]).toBe(
        "/api/v1/map/features?bbox=-3.5,4.3,1.5,11.3&layers=observations",
      );
    } finally {
      vi.unstubAllGlobals();
    }
  });
  it("preserves a GeoJSON multipolygon, coverage code, and demo attribution", () => {
    const geometry = {
      type: "MultiPolygon" as const,
      coordinates: [
        [
          [
            [-2, 5] as [number, number],
            [-1, 5] as [number, number],
            [-2, 5] as [number, number],
          ],
        ],
      ],
    };
    const result = adaptMapFeature({
      type: "Feature",
      id: "region",
      geometry,
      properties: {
        featureType: "coverage_region",
        layer: "coverage",
        title: "Monitoring area",
        source: "PostGIS",
        code: "GHA-XER-W001",
        isDemo: true,
      },
    });
    expect(result.geometry).toEqual(geometry);
    expect(result.properties.coverageCode).toBe("GHA-XER-W001");
    expect(result.properties.isDemo).toBe(true);
    expect(result.properties.confidence).toBeUndefined();
  });
  it("chooses an advertised imagery date, not a fabricated date", () => {
    expect(satelliteForYear(2020).date).toMatch(/^2020-/);
    expect(Number(satelliteForYear(2030).date.slice(0, 4))).toBeLessThanOrEqual(
      2030,
    );
  });
  it("keeps district provenance separate from observations and demo monitoring", () => {
    const result = adaptMapFeature({
      type: "Feature",
      id: "district",
      geometry: { type: "MultiPolygon", coordinates: [] },
      properties: {
        featureType: "administrative_boundary",
        layer: "boundaries",
        title: "District",
        source: "GSS",
        sourceUrl: "https://statsbank.statsghana.gov.gh/censusatlas/",
        datasetVersion: "gss-phc2021-district261-2023-10-05",
        boundaryLevel: "district",
        isDemo: false,
      },
    });
    expect(result.properties.datasetVersion).toBe(
      "gss-phc2021-district261-2023-10-05",
    );
    expect(result.properties.sourceUrl).toContain("statsghana.gov.gh");
    expect(result.observedAt).toBeUndefined();
    expect(result.properties.observationId).toBeUndefined();
    expect(result.properties.confidence).toBeUndefined();
    expect(result.properties.isDemo).toBe(false);
  });
});
