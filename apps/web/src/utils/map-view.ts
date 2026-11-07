// Display/navigation limits, not authoritative coverage or administrative boundaries.
export const ghanaViewBounds: [[number, number], [number, number]] = [
  [4.1, -3.6],
  [11.5, 1.6],
];
export const initialMapView = {
  center: [6.1, -1.65] as [number, number],
  zoom: 11,
};

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
