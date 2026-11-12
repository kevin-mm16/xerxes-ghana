import outline from "@/config/ghana-focus.json";
import type {
  IntelligenceFeature,
  IntelligenceFeatureType,
} from "@/types/intelligence";

type Coordinate = [number, number];
type Ring = Coordinate[];

function signedArea(ring: Ring) {
  return (
    ring.reduce((area, point, index) => {
      const next = ring[(index + 1) % ring.length];
      return area + point[0] * next[1] - next[0] * point[1];
    }, 0) / 2
  );
}

// Pinned full geoBoundaries ADM0 source. This is display geography only;
// provenance and the distinction from GSS districts are in docs/map-focus.md.
export const ghanaOutline = outline.features[0].geometry.coordinates as Ring[];
const countryHole =
  signedArea(ghanaOutline[0]) < 0
    ? ghanaOutline[0]
    : [...ghanaOutline[0]].reverse();
// Covers all context reachable within this workspace without crossing the
// antimeridian. Opposite winding also makes the hole explicit to Google Data.
export const ghanaFocusGeometry = {
  type: "Polygon" as const,
  coordinates: [
    [
      [-80, -45],
      [80, -45],
      [80, 60],
      [-80, 60],
      [-80, -45],
    ] as Ring,
    countryHole,
  ],
};
export const ghanaFocusPositions = ghanaFocusGeometry.coordinates.map((ring) =>
  ring.map(([lng, lat]) => [lat, lng] as Coordinate),
);

export function featurePositions(
  feature: IntelligenceFeature,
): Ring[] | Ring[][] {
  const ring = (points: Ring) =>
    points.map(([lng, lat]) => [lat, lng] as Coordinate);
  if (feature.geometry.type === "Polygon")
    return feature.geometry.coordinates.map(ring);
  if (feature.geometry.type === "MultiPolygon")
    return feature.geometry.coordinates.map((polygon) => polygon.map(ring));
  return [];
}

export function featureBounds(
  feature: IntelligenceFeature,
): [Coordinate, Coordinate] {
  const coordinates =
    feature.geometry.type === "Point"
      ? [feature.geometry.coordinates]
      : feature.geometry.type === "Polygon"
        ? feature.geometry.coordinates.flat()
        : feature.geometry.coordinates.flat(2);
  const lngs = coordinates.map(([lng]) => lng);
  const lats = coordinates.map(([, lat]) => lat);
  return [
    [Math.min(...lats), Math.min(...lngs)],
    [Math.max(...lats), Math.max(...lngs)],
  ];
}

export function districtZoomTier(zoom: number) {
  return zoom < 9 ? 0 : zoom < 11 ? 1 : zoom < 13 ? 2 : 3;
}

export function focusOpacity(tier: number) {
  return tier === 0 ? 0.6 : tier === 1 ? 0.4 : 0.18;
}

export function overlayStyle(
  type: IntelligenceFeatureType,
  selected: boolean,
  tier: number,
) {
  if (type === "administrative_boundary")
    return {
      color: "#c7b998",
      weight: selected ? 1.8 : tier === 1 ? 0.65 : 0.85,
      opacity: selected ? 0.95 : tier === 1 ? 0.28 : 0.62,
      fillColor: "#c7b998",
      fillOpacity: selected ? 0.035 : 0,
    };
  if (type === "coverage_region")
    return {
      color: "#7ba88c",
      weight: selected ? 2 : 1.2,
      opacity: selected ? 0.95 : 0.75,
      fillColor: "#7ba88c",
      fillOpacity: selected ? 0.08 : 0.025,
    };
  return {
    color: type === "ai_candidate" ? "#b2a2d0" : "#e0b870",
    weight: selected ? 2.5 : 1.5,
    opacity: 0.95,
    fillColor: type === "ai_candidate" ? "#b2a2d0" : "#e0b870",
    fillOpacity: selected ? 0.12 : 0.04,
  };
}
