"use client";

import { CircleMarker, MapContainer, Polygon, TileLayer, Tooltip } from "react-leaflet";
import type { LatLngBoundsExpression, LatLngExpression } from "leaflet";
import type { IntelligenceFeature } from "@/types/intelligence";
import { severityPinColors } from "@/utils/badges";

interface HotspotMapProps {
  features: IntelligenceFeature[];
  selectedFeatureId?: string;
  onSelectFeature: (feature: IntelligenceFeature) => void;
  compact?: boolean;
}

const ghanaCenter: LatLngExpression = [7.9465, -1.0232];
const ghanaBounds: LatLngBoundsExpression = [
  [4.35, -3.45],
  [11.25, 1.4],
];

function polygonPositions(feature: IntelligenceFeature): LatLngExpression[][] {
  if (feature.geometry.type !== "Polygon") return [];

  return feature.geometry.coordinates.map((ring) =>
    ring.map(([lng, lat]) => [lat, lng] as LatLngExpression),
  );
}

function pointPosition(feature: IntelligenceFeature): LatLngExpression | null {
  if (feature.geometry.type !== "Point") return null;
  const [lng, lat] = feature.geometry.coordinates;
  return [lat, lng];
}

export function HotspotMap({ features, selectedFeatureId, onSelectFeature, compact = false }: HotspotMapProps) {
  return (
    <div className={compact ? "relative h-[520px] overflow-hidden rounded-3xl" : "relative h-full min-h-[640px] overflow-hidden"}>
      <MapContainer
        center={ghanaCenter}
        zoom={7}
        minZoom={6}
        maxZoom={14}
        maxBounds={ghanaBounds}
        maxBoundsViscosity={0.8}
        scrollWheelZoom
        className="z-0 h-full min-h-[520px] w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {features.map((feature) => {
          const selected = feature.id === selectedFeatureId;

          if (feature.geometry.type === "Polygon") {
            const isCoverage = feature.type === "coverage_region";
            return (
              <Polygon
                key={feature.id}
                positions={polygonPositions(feature)}
                pathOptions={{
                  color: isCoverage ? "#147a4b" : "#d98a24",
                  weight: selected ? 4 : 2,
                  fillColor: isCoverage ? "#3ca66d" : "#f2b84b",
                  fillOpacity: isCoverage ? 0.12 : 0.18,
                  dashArray: isCoverage ? undefined : "7 7",
                }}
                eventHandlers={{ click: () => onSelectFeature(feature) }}
              >
                <Tooltip sticky>
                  <span className="text-xs font-semibold">{feature.properties.title}</span>
                </Tooltip>
              </Polygon>
            );
          }

          const center = pointPosition(feature);
          if (!center) return null;

          const isAi = feature.type === "ai_candidate";
          const fillColor = isAi
            ? "#7c3aed"
            : feature.properties.severity
              ? severityPinColors[feature.properties.severity]
              : "#17663f";

          return (
            <CircleMarker
              key={feature.id}
              center={center}
              radius={selected ? 13 : isAi ? 10 : 9}
              pathOptions={{
                color: "#ffffff",
                weight: selected ? 4 : 3,
                fillColor,
                fillOpacity: 0.94,
              }}
              eventHandlers={{ click: () => onSelectFeature(feature) }}
            >
              <Tooltip direction="top" offset={[0, -6]} opacity={0.95}>
                <span className="text-xs font-semibold">{feature.properties.title}</span>
              </Tooltip>
            </CircleMarker>
          );
        })}
      </MapContainer>

      <div className="pointer-events-none absolute bottom-2 left-2 z-[450] rounded-lg bg-white/90 px-2 py-1 text-[10px] text-muted shadow-sm">
        Public locations are generalized. Demo layers use synthetic data.
      </div>
    </div>
  );
}
