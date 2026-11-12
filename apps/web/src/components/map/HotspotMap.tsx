"use client";

import { useState } from "react";
import {
  CircleMarker,
  MapContainer,
  Polygon,
  ScaleControl,
  TileLayer,
  Tooltip,
  ZoomControl,
} from "react-leaflet";
import type { LatLngExpression } from "leaflet";
import type { IntelligenceFeature } from "@/types/intelligence";
import { EarthBaseLayer } from "./EarthBaseLayer";
import { MapNavigation } from "./MapNavigation";
import { ghanaViewBounds, initialMapView } from "@/utils/map-view";
import type { ImageryStatus } from "@/services/imagery";
import { placeLabels } from "@/services/imagery";
import type { IntelligenceMapProps } from "./map-props";

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
export function HotspotMap({
  timelineVisible = false,
  features,
  selectedFeatureId,
  onSelectFeature,
  compact = false,
  showLabels = true,
}: IntelligenceMapProps) {
  const [imagery, setImagery] = useState<ImageryStatus>();
  const [labelsFailed, setLabelsFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  return (
    <div
      className={
        compact
          ? "relative h-[520px] overflow-hidden rounded-3xl"
          : "relative h-full overflow-hidden"
      }
    >
      <MapContainer
        center={initialMapView.center}
        zoom={initialMapView.zoom}
        minZoom={6}
        maxZoom={19}
        maxBounds={ghanaViewBounds}
        maxBoundsViscosity={0.8}
        zoomControl={false}
        fadeAnimation={false}
        scrollWheelZoom
        className="z-0 h-full w-full"
      >
        <EarthBaseLayer key={attempt} onStateChange={setImagery} />
        {showLabels && (
          <TileLayer
            url={placeLabels.transportUrl}
            maxNativeZoom={19}
            zIndex={399}
            updateWhenIdle
            eventHandlers={{ tileerror: () => setLabelsFailed(true) }}
          />
        )}
        {showLabels && (
          <TileLayer
            url={placeLabels.url}
            attribution={placeLabels.attribution}
            maxNativeZoom={19}
            zIndex={400}
            updateWhenIdle
            eventHandlers={{ tileerror: () => setLabelsFailed(true) }}
          />
        )}
        <MapNavigation />
        <ZoomControl position="bottomright" />
        <ScaleControl position="bottomright" imperial={false} />
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
                    feature.type === "administrative_boundary"
                      ? "#f8df8b"
                      : feature.type === "coverage_region"
                        ? "#00d084"
                        : "#f59e0b",
                  weight: selected ? 4 : 2,
                  fillOpacity:
                    feature.type === "administrative_boundary" ? 0.015 : 0.08,
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
        data-provider={imagery?.provider}
        className={`absolute left-3 z-[450] max-w-[70%] rounded-lg bg-black/70 px-3 py-1.5 text-[10px] text-white ${timelineVisible ? "bottom-16" : "bottom-6"}`}
      >
        {features.some(
          (feature) => feature.type === "administrative_boundary",
        ) && (
          <div
            className="mb-1 flex items-center gap-2 text-[11px] font-semibold"
            data-testid="district-legend"
          >
            <span
              aria-hidden="true"
              className="w-5 border-t-2 border-[#f8df8b]"
            />
            GSS district boundaries | 2021 census
          </div>
        )}
        {imagery?.label ?? "Loading satellite imagery..."}
        {showLabels &&
          (labelsFailed
            ? " | Some place labels unavailable"
            : " | Esri place labels")}
        {imagery?.state === "unavailable" && (
          <button
            type="button"
            onClick={() => setAttempt((value) => value + 1)}
            className="ml-2 font-bold underline"
          >
            Retry imagery
          </button>
        )}
      </div>
    </div>
  );
}
