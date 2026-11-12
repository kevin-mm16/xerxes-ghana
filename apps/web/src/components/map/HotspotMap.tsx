"use client";

import { useEffect, useRef } from "react";
import {
  MapContainer,
  ScaleControl,
  ZoomControl,
  useMap,
  useMapEvents,
} from "react-leaflet";
import {
  ghanaCountryBounds,
  ghanaViewBounds,
  initialMapView,
  mapViewport,
} from "@/utils/map-view";
import { featureBounds } from "@/utils/map-geometry";
import { MapNavigation } from "./MapNavigation";
import { MapFeatureLayers } from "./MapFeatureLayers";
import { SatelliteLayers } from "./SatelliteLayers";
import type { IntelligenceMapProps } from "./map-props";

function CameraController({
  initialCamera,
  onCameraChange,
  onViewportChange,
  focusFeature,
}: Pick<
  IntelligenceMapProps,
  "initialCamera" | "onCameraChange" | "onViewportChange" | "focusFeature"
>) {
  const map = useMap();
  const initial = useRef(initialCamera);
  const changed = useRef(onCameraChange);
  changed.current = onCameraChange;
  const viewportChanged = useRef(onViewportChange);
  viewportChanged.current = onViewportChange;
  function reportView() {
    const center = map.getCenter();
    const zoom = map.getZoom();
    changed.current?.({ center: [center.lat, center.lng], zoom });
    const bounds = map.getBounds();
    const viewport = mapViewport(
      [
        bounds.getWest(),
        bounds.getSouth(),
        bounds.getEast(),
        bounds.getNorth(),
      ],
      zoom,
    );
    if (viewport) viewportChanged.current?.(viewport);
  }
  useEffect(() => {
    if (initial.current)
      map.setView(initial.current.center, initial.current.zoom, {
        animate: false,
      });
    else
      map.fitBounds(ghanaCountryBounds, { padding: [40, 48], animate: false });
    reportView();
  }, [map]);
  useMapEvents({
    moveend: reportView,
    zoomend: reportView,
    resize: reportView,
  });
  useEffect(() => {
    if (!focusFeature) return;
    if (focusFeature.geometry.type === "Point") {
      const [lng, lat] = focusFeature.geometry.coordinates;
      map.setView([lat, lng], 14);
    } else
      map.fitBounds(featureBounds(focusFeature), {
        padding: [56, 56],
        maxZoom: 13,
        animate: false,
      });
  }, [focusFeature, map]);
  return null;
}

export function HotspotMap({
  features,
  selectedFeatureId,
  onSelectFeature,
  compact = false,
  showLabels = false,
  timelineVisible = false,
  initialCamera,
  onCameraChange,
  onViewportChange,
  focusFeature,
}: IntelligenceMapProps) {
  return (
    <div className="relative h-full overflow-hidden">
      <MapContainer
        center={initialCamera?.center ?? initialMapView.center}
        zoom={initialCamera?.zoom ?? initialMapView.zoom}
        minZoom={6}
        maxZoom={19}
        zoomSnap={0.25}
        maxBounds={ghanaViewBounds}
        maxBoundsViscosity={0.8}
        zoomControl={false}
        fadeAnimation={false}
        scrollWheelZoom={!compact}
        className="z-0 h-full w-full"
      >
        <CameraController
          initialCamera={initialCamera}
          onCameraChange={onCameraChange}
          onViewportChange={onViewportChange}
          focusFeature={focusFeature}
        />
        <SatelliteLayers
          showLabels={showLabels}
          timelineVisible={timelineVisible}
        />
        <MapFeatureLayers
          features={features}
          selectedFeatureId={selectedFeatureId}
          onSelectFeature={onSelectFeature}
        />
        <MapNavigation />
        <ZoomControl position="bottomright" />
        <ScaleControl position="bottomright" imperial={false} />
      </MapContainer>
    </div>
  );
}
