import { describe, expect, it } from "vitest";
import { adaptMapFeature } from "@/services/map-data";
import { satelliteForYear } from "@/services/imagery";

describe("map domain boundary", () => {
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
});
