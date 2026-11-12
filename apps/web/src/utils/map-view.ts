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
