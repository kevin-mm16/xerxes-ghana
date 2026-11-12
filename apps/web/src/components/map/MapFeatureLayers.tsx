"use client";

import { memo, useMemo, useState } from "react";
import {
  CircleMarker,
  Pane,
  Polygon,
  Tooltip,
  useMap,
  useMapEvents,
} from "react-leaflet";
import type { IntelligenceFeature } from "@/types/intelligence";
import type { LeafletMouseEvent } from "leaflet";
import {
  districtZoomTier,
  featurePositions,
  focusOpacity,
  ghanaFocusPositions,
  overlayStyle,
} from "@/utils/map-geometry";

const FeatureLayer = memo(function FeatureLayer({
  feature,
  selected,
  tier,
  onSelect,
}: {
  feature: IntelligenceFeature;
  selected: boolean;
  tier: number;
  onSelect: (feature: IntelligenceFeature) => void;
}) {
  // Retain positions through raster progress and selection elsewhere. Otherwise
  // React Leaflet reprojects every vertex with unnecessary setLatLngs calls.
  const positions = useMemo(
    () => featurePositions(feature),
    [feature.geometry],
  );
  const style = useMemo(
    () => overlayStyle(feature.type, selected, tier),
    [feature.type, selected, tier],
  );
  const events = useMemo(
    () => ({
      click: () => onSelect(feature),
      mouseover: (event: LeafletMouseEvent) => {
        if (feature.geometry.type !== "Point")
          event.target.setStyle({ opacity: 0.95, weight: style.weight + 0.4 });
      },
      mouseout: (event: LeafletMouseEvent) => {
        if (feature.geometry.type !== "Point") event.target.setStyle(style);
      },
    }),
    [feature, onSelect, style],
  );
  const center = useMemo(
    () =>
      feature.geometry.type === "Point"
        ? ([
            feature.geometry.coordinates[1],
            feature.geometry.coordinates[0],
          ] as [number, number])
        : undefined,
    [feature.geometry],
  );
  if (center)
    return (
      <CircleMarker
        center={center}
        radius={selected ? 10 : 6}
        pathOptions={{
          color: "#f5f3ed",
          fillColor: feature.type === "ai_candidate" ? "#8e79ac" : "#346c55",
          fillOpacity: 1,
          weight: selected ? 3 : 1.5,
        }}
        eventHandlers={events}
      >
        <Tooltip>{feature.properties.title}</Tooltip>
      </CircleMarker>
    );
  return (
    <Polygon
      positions={positions}
      pathOptions={style}
      eventHandlers={events}
      smoothFactor={0}
    >
      {(feature.type !== "administrative_boundary" ||
        tier >= 3 ||
        selected) && <Tooltip sticky>{feature.properties.title}</Tooltip>}
    </Polygon>
  );
});

export const MapFeatureLayers = memo(function MapFeatureLayers({
  features,
  selectedFeatureId,
  onSelectFeature,
}: {
  features: IntelligenceFeature[];
  selectedFeatureId?: string;
  onSelectFeature: (feature: IntelligenceFeature) => void;
}) {
  const map = useMap();
  const [tier, setTier] = useState(() => districtZoomTier(map.getZoom()));
  useMapEvents({ zoomend: () => setTier(districtZoomTier(map.getZoom())) });
  return (
    <>
      <Pane name="ghana-focus" style={{ zIndex: 410, pointerEvents: "none" }}>
        <Polygon
          positions={ghanaFocusPositions}
          interactive={false}
          smoothFactor={0}
          pathOptions={{
            stroke: false,
            fillColor: "#101a1b",
            fillOpacity: focusOpacity(tier),
            fillRule: "evenodd",
          }}
        />
      </Pane>
      <Pane name="intelligence-features" style={{ zIndex: 420 }}>
        {features
          .filter(
            (feature) => feature.type !== "administrative_boundary" || tier > 0,
          )
          .map((feature) => (
            <FeatureLayer
              key={feature.id}
              feature={feature}
              selected={feature.id === selectedFeatureId}
              tier={feature.type === "administrative_boundary" ? tier : 0}
              onSelect={onSelectFeature}
            />
          ))}
      </Pane>
    </>
  );
});
