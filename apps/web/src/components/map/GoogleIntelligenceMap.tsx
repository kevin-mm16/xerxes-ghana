"use client";

import { useEffect, useRef, useState } from "react";
import {
  loadGoogleMaps,
  onGoogleMapsAuthFailure,
} from "@/services/google-maps";
import { ghanaViewBounds, initialMapView } from "@/utils/map-view";
import { MapNavigationPanel } from "./MapNavigationPanel";
import type { IntelligenceMapProps } from "./map-props";

export function GoogleIntelligenceMap({
  apiKey,
  onUnavailable,
  features,
  selectedFeatureId,
  onSelectFeature,
  showLabels = true,
  timelineVisible = false,
  compact = false,
}: IntelligenceMapProps & { apiKey: string; onUnavailable: () => void }) {
  const container = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map>();
  const [ready, setReady] = useState(false);
  const selection = useRef(onSelectFeature);
  selection.current = onSelectFeature;
  const featureLookup = useRef(
    new globalThis.Map(features.map((feature) => [feature.id, feature])),
  );
  featureLookup.current = new globalThis.Map(
    features.map((feature) => [feature.id, feature]),
  );
  useEffect(() => {
    let disposed = false;
    let instance: google.maps.Map | undefined;
    let idle: google.maps.MapsEventListener | undefined;
    let click: google.maps.MapsEventListener | undefined;
    let hover: google.maps.MapsEventListener | undefined;
    let leave: google.maps.MapsEventListener | undefined;
    let info: google.maps.InfoWindow | undefined;
    const timeout = setTimeout(onUnavailable, 20000);
    const unsubscribe = onGoogleMapsAuthFailure(onUnavailable);
    loadGoogleMaps(apiKey)
      .then(({ Map, InfoWindow }) => {
        if (disposed || !container.current) return;
        const [[south, west], [north, east]] = ghanaViewBounds;
        instance = new Map(container.current, {
          center: {
            lat: initialMapView.center[0],
            lng: initialMapView.center[1],
          },
          zoom: initialMapView.zoom,
          minZoom: 6,
          maxZoom: 19,
          restriction: {
            latLngBounds: { south, west, north, east },
            strictBounds: false,
          },
          mapTypeId: "hybrid",
          disableDefaultUI: true,
          zoomControl: true,
          zoomControlOptions: {
            position: google.maps.ControlPosition.RIGHT_BOTTOM,
          },
          scaleControl: true,
          clickableIcons: false,
          gestureHandling: "greedy",
        });
        idle = google.maps.event.addListenerOnce(
          instance,
          "tilesloaded",
          () => {
            clearTimeout(timeout);
            if (!disposed) setReady(true);
          },
        );
        info = new InfoWindow({ disableAutoPan: true });
        hover = instance.data.addListener(
          "mouseover",
          (event: google.maps.Data.MouseEvent) => {
            const content = document.createElement("span");
            content.textContent = String(event.feature.getProperty("title"));
            info?.setContent(content);
            info?.setPosition(event.latLng);
            info?.open(instance);
          },
        );
        leave = instance.data.addListener("mouseout", () => info?.close());
        click = instance.data.addListener(
          "click",
          (event: google.maps.Data.MouseEvent) => {
            const feature = featureLookup.current.get(
              String(event.feature.getId()),
            );
            if (feature) selection.current(feature);
          },
        );
        setMap(instance);
      })
      .catch(() => {
        if (!disposed) onUnavailable();
      });
    return () => {
      disposed = true;
      clearTimeout(timeout);
      unsubscribe();
      idle?.remove();
      click?.remove();
      hover?.remove();
      leave?.remove();
      info?.close();
      instance?.data.forEach((feature) => instance?.data.remove(feature));
    };
  }, [apiKey, onUnavailable]);

  useEffect(() => {
    map?.setMapTypeId(showLabels ? "hybrid" : "satellite");
  }, [map, showLabels]);
  useEffect(() => {
    if (!map) return;
    map.data.forEach((feature) => map.data.remove(feature));
    for (const feature of features) {
      map.data.addGeoJson({
        type: "Feature",
        id: feature.id,
        geometry: feature.geometry,
        properties: { title: feature.properties.title, type: feature.type },
      });
    }
    map.data.setStyle((feature) => ({
      strokeColor:
        feature.getProperty("type") === "administrative_boundary"
          ? "#f8df8b"
          : feature.getProperty("type") === "coverage_region"
            ? "#00d084"
            : "#f59e0b",
      strokeWeight: String(feature.getId()) === selectedFeatureId ? 4 : 2,
      fillOpacity:
        feature.getProperty("type") === "administrative_boundary"
          ? 0.015
          : 0.08,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: String(feature.getId()) === selectedFeatureId ? 10 : 7,
        fillColor: "#17663f",
        fillOpacity: 0.94,
        strokeColor: "white",
        strokeWeight: 2,
      },
    }));
  }, [map, features, selectedFeatureId]);

  return (
    <div
      className={
        compact
          ? "relative h-[520px] overflow-hidden rounded-3xl"
          : "relative h-full overflow-hidden"
      }
    >
      <div
        ref={container}
        className="h-full w-full"
        aria-label="Satellite map of Ghana"
      />
      {map && (
        <MapNavigationPanel
          onOverview={() => {
            const [[south, west], [north, east]] = ghanaViewBounds;
            map.fitBounds({ south, west, north, east }, 24);
          }}
          onCoordinates={(point) => {
            map.setCenter(point);
            map.setZoom(16);
          }}
        />
      )}
      <div
        role="status"
        data-provider="google"
        className={`absolute left-3 z-[450] max-w-[70%] rounded-lg bg-black/70 px-3 py-1.5 text-[10px] text-white ${timelineVisible ? "bottom-16" : "bottom-10"}`}
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
        {ready
          ? `Google ${showLabels ? "Hybrid" : "Satellite"} | imagery dates vary`
          : "Loading Google satellite imagery..."}
      </div>
    </div>
  );
}
