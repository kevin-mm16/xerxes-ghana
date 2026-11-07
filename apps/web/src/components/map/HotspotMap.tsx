"use client";

import { useState } from "react";
import { CircleMarker, MapContainer, Polygon, Tooltip } from "react-leaflet";
import type { LatLngExpression, LatLngBoundsExpression } from "leaflet";
import type { IntelligenceFeature } from "@/types/intelligence";
import { EarthBaseLayer } from "./EarthBaseLayer";

interface Props {
  imageryYear: number;
  features: IntelligenceFeature[];
  selectedFeatureId?: string;
  onSelectFeature: (feature: IntelligenceFeature) => void;
  compact?: boolean;
}
function positions(
  feature: IntelligenceFeature,
): LatLngExpression[][] | LatLngExpression[][][] {
  const ring = (points: [number, number][]) =>
    points.map(([lng, lat]) => [lat, lng] as LatLngExpression);
  if (feature.geometry.type === "Polygon")
    return feature.geometry.coordinates.map(ring);
  if (feature.geometry.type === "MultiPolygon")
    return feature.geometry.coordinates.map((polygon) => polygon.map(ring));
  return [];
}
const bounds: LatLngBoundsExpression = [
  [4.1, -3.6],
  [11.5, 1.6],
];
export function HotspotMap({
  imageryYear,
  features,
  selectedFeatureId,
  onSelectFeature,
  compact = false,
}: Props) {
  const [sourceLabel, setSourceLabel] = useState("");
  return (
    <div
      className={
        compact
          ? "relative h-[520px] overflow-hidden rounded-3xl"
          : "relative h-full overflow-hidden"
      }
    >
      <MapContainer
        center={[7.9465, -1.0232]}
        zoom={7}
        minZoom={6}
        maxZoom={18}
        maxBounds={bounds}
        maxBoundsViscosity={0.8}
        zoomControl={false}
        scrollWheelZoom
        className="z-0 h-full w-full"
      >
        <EarthBaseLayer
          key={imageryYear}
          year={imageryYear}
          onSourceChange={setSourceLabel}
        />
        {features.map((feature) => {
          const selected = feature.id === selectedFeatureId;
          const events = { click: () => onSelectFeature(feature) };
          if (feature.geometry.type !== "Point")
            return (
              <Polygon
                key={feature.id}
                positions={positions(feature)}
                pathOptions={{
                  color:
                    feature.type === "coverage_region" ? "#00d084" : "#f59e0b",
                  weight: selected ? 4 : 2,
                  fillOpacity: 0.08,
                }}
                eventHandlers={events}
              >
                <Tooltip sticky>{feature.properties.title}</Tooltip>
              </Polygon>
            );
          const [lng, lat] = feature.geometry.coordinates;
          return (
            <CircleMarker
              key={feature.id}
              center={[lat, lng]}
              radius={selected ? 12 : 8}
              pathOptions={{
                color: "white",
                fillColor:
                  feature.type === "ai_candidate" ? "#7c3aed" : "#17663f",
                fillOpacity: 0.94,
                weight: selected ? 4 : 2,
              }}
              eventHandlers={events}
            >
              <Tooltip>{feature.properties.title}</Tooltip>
            </CircleMarker>
          );
        })}
      </MapContainer>
      <div
        role="status"
        className="pointer-events-none absolute bottom-16 left-3 z-[450] max-w-[calc(100%-1.5rem)] rounded-lg bg-black/70 px-3 py-1.5 text-[10px] text-white sm:bottom-16"
      >
        {sourceLabel}
      </div>
    </div>
  );
}
