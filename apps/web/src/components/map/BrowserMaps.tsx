"use client";

import dynamic from "next/dynamic";

// Leaflet reads browser globals when imported. Keep this boundary at the maps
// so page headings, content, navigation, and forms can still render on the server.
function MapLoading() {
  return <p role="status" className="rounded-2xl bg-forest-50 p-6 text-sm text-muted">Loading map...</p>;
}

export const CoordinateMapPreview = dynamic(
  () => import("./CoordinateMapPreview").then((module) => module.CoordinateMapPreview),
  { ssr: false, loading: MapLoading },
);

export const HotspotMap = dynamic(
  () => import("./HotspotMap").then((module) => module.HotspotMap),
  { ssr: false, loading: MapLoading },
);

export const LocationMapPreview = dynamic(
  () => import("./LocationMapPreview").then((module) => module.LocationMapPreview),
  { ssr: false, loading: MapLoading },
);
