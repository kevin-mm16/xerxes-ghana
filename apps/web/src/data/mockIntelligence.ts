import type { IntelligenceFeature } from "@/types/intelligence";

export const mockCoverageFeatures: IntelligenceFeature[] = [
  {
    id: "coverage-ankobra",
    type: "coverage_region",
    geometry: {
      type: "Polygon",
      coordinates: [[
        [-2.55, 5.05],
        [-1.78, 5.05],
        [-1.72, 5.76],
        [-2.5, 5.82],
        [-2.55, 5.05],
      ]],
    },
    properties: {
      title: "Ankobra monitoring corridor",
      layer: "coverage",
      source: "XERSXES coverage plan",
      region: "Western",
      category: "Active monitoring area",
      summary: "Illustrative coverage polygon for the map-first frontend. Production geometry will be versioned in PostGIS.",
    },
  },
  {
    id: "coverage-offin",
    type: "coverage_region",
    geometry: {
      type: "Polygon",
      coordinates: [[
        [-2.05, 5.62],
        [-1.3, 5.62],
        [-1.22, 6.34],
        [-2.0, 6.32],
        [-2.05, 5.62],
      ]],
    },
    properties: {
      title: "Offin monitoring area",
      layer: "coverage",
      source: "XERSXES coverage plan",
      region: "Central",
      category: "Active monitoring area",
      summary: "Illustrative coverage polygon spanning the public demo area around the Offin system.",
    },
  },
  {
    id: "coverage-atewa",
    type: "coverage_region",
    geometry: {
      type: "Polygon",
      coordinates: [[
        [-0.9, 5.88],
        [-0.28, 5.88],
        [-0.2, 6.48],
        [-0.86, 6.5],
        [-0.9, 5.88],
      ]],
    },
    properties: {
      title: "Atewa headwaters monitoring area",
      layer: "coverage",
      source: "XERSXES coverage plan",
      region: "Eastern",
      category: "Active monitoring area",
      summary: "Illustrative coverage polygon for environmental observations around the Atewa headwaters.",
    },
  },
];

export const mockAiFeatures: IntelligenceFeature[] = [
  {
    id: "ai-2026-001",
    type: "ai_candidate",
    observedAt: "2026-07-06",
    geometry: { type: "Point", coordinates: [-2.03, 5.39] },
    properties: {
      title: "Exposed-earth change candidate",
      layer: "ai",
      source: "XERSXES model simulation",
      modelVersion: "xersxes-vision-v0.1-demo",
      region: "Western",
      category: "Land disturbance candidate",
      confidence: 0.78,
      summary: "Synthetic AI output used to validate the frontend contract. It is not a confirmed finding.",
    },
  },
  {
    id: "ai-2026-002",
    type: "ai_candidate",
    observedAt: "2026-07-06",
    geometry: { type: "Point", coordinates: [-0.62, 6.13] },
    properties: {
      title: "Vegetation-loss candidate",
      layer: "ai",
      source: "XERSXES model simulation",
      modelVersion: "xersxes-vision-v0.1-demo",
      region: "Eastern",
      category: "Vegetation disturbance candidate",
      confidence: 0.71,
      summary: "Synthetic inference preview. Human review and source imagery remain required.",
    },
  },
];

export const mockSatelliteFeatures: IntelligenceFeature[] = [
  {
    id: "sat-2024-offin",
    type: "satellite_change",
    observedAt: "2024-07-01",
    geometry: {
      type: "Polygon",
      coordinates: [[
        [-1.9, 5.8],
        [-1.62, 5.8],
        [-1.58, 6.05],
        [-1.87, 6.08],
        [-1.9, 5.8],
      ]],
    },
    properties: {
      title: "2024 satellite change preview",
      layer: "satellite",
      source: "Synthetic satellite layer",
      region: "Central",
      category: "Historical change preview",
      confidence: 0.64,
      summary: "Placeholder geometry showing how historical raster/vector change products will enter the map.",
    },
  },
  {
    id: "sat-2022-western",
    type: "satellite_change",
    observedAt: "2022-07-01",
    geometry: {
      type: "Polygon",
      coordinates: [[
        [-2.34, 5.18],
        [-2.02, 5.18],
        [-1.98, 5.5],
        [-2.3, 5.52],
        [-2.34, 5.18],
      ]],
    },
    properties: {
      title: "2022 satellite change preview",
      layer: "satellite",
      source: "Synthetic satellite layer",
      region: "Western",
      category: "Historical change preview",
      confidence: 0.59,
      summary: "Placeholder historical feature used to exercise the timeline and satellite layer contract.",
    },
  },
];
