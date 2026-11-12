// Display/navigation limits, not authoritative coverage or administrative boundaries.
export const ghanaViewBounds: [[number, number], [number, number]] = [
  [4.1, -3.6],
  [11.5, 1.6],
];
// Full ADM0 display outline bounds. Kept separate from the looser pan limits.
export const ghanaCountryBounds: [[number, number], [number, number]] = [
  [4.73672, -3.25542],
  [11.1733, 1.19178],
];
export const initialMapView = {
  center: [7.95501, -1.03182] as [number, number],
  zoom: 6,
};

export interface MapCamera {
  center: [number, number];
  zoom: number;
}

/** Public map query extent in GeoJSON order, independent of either renderer. */
export type MapBbox = [
  west: number,
  south: number,
  east: number,
  north: number,
];
export interface MapViewport {
  bbox: MapBbox;
  zoom: number;
}

export const districtMinimumZoom = 9;

export function mapViewport(
  bbox: MapBbox,
  zoom: number,
): MapViewport | undefined {
  if (!Number.isFinite(zoom) || bbox.some((value) => !Number.isFinite(value)))
    return;
  // The workspace is constrained to Ghana; trim off-screen world context before
  // making a public data request. Four decimals avoid duplicate sub-pixel reads.
  const [[south, west], [north, east]] = ghanaViewBounds;
  const clipped: MapBbox = [
    Math.max(west, bbox[0]),
    Math.max(south, bbox[1]),
    Math.min(east, bbox[2]),
    Math.min(north, bbox[3]),
  ].map((value) => Number(value.toFixed(4))) as MapBbox;
  if (clipped[0] >= clipped[2] || clipped[1] >= clipped[3]) return;
  return { bbox: clipped, zoom };
}

export function parseMapCoordinates(latitude: string, longitude: string) {
  const lat = Number(latitude.trim());
  const lng = Number(longitude.trim());
  const [[south, west], [north, east]] = ghanaViewBounds;
  if (
    !latitude.trim() ||
    !longitude.trim() ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    lat < south ||
    lat > north ||
    lng < west ||
    lng > east
  ) {
    throw new Error(
      "Enter valid latitude and longitude within the Ghana workspace.",
    );
  }
  return { lat, lng };
}
