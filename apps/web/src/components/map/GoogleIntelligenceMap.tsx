"use client";

import { useEffect, useRef, useState } from "react";
import {
  loadGoogleMaps,
  onGoogleMapsAuthFailure,
} from "@/services/google-maps";
import {
  ghanaCountryBounds,
  ghanaViewBounds,
  initialMapView,
} from "@/utils/map-view";
import {
  districtZoomTier,
  featureBounds,
  focusOpacity,
  ghanaFocusGeometry,
  overlayStyle,
} from "@/utils/map-geometry";
import { MapNavigationPanel } from "./MapNavigationPanel";
import { MapSourceStatus } from "./MapSourceStatus";
import type { IntelligenceMapProps } from "./map-props";
import type { IntelligenceFeature } from "@/types/intelligence";

const focusId = "xersxes-country-focus";
const boundsLiteral = (bounds: [[number, number], [number, number]]) => ({
  south: bounds[0][0],
  west: bounds[0][1],
  north: bounds[1][0],
  east: bounds[1][1],
});

export function GoogleIntelligenceMap({
  apiKey,
  onUnavailable,
  features,
  selectedFeatureId,
  onSelectFeature,
  showLabels = false,
  timelineVisible = false,
  initialCamera,
  onCameraChange,
  focusFeature,
}: IntelligenceMapProps & { apiKey: string; onUnavailable: () => void }) {
  const container = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map>();
  const [ready, setReady] = useState(false);
  const [tier, setTier] = useState(0);
  const initial = useRef(initialCamera);
  const selection = useRef(onSelectFeature);
  selection.current = onSelectFeature;
  const cameraChanged = useRef(onCameraChange);
  cameraChanged.current = onCameraChange;
  const featureLookup = useRef(
    new globalThis.Map<string, IntelligenceFeature>(),
  );
  featureLookup.current = new globalThis.Map(
    features.map((feature) => [feature.id, feature]),
  );
  const rendered = useRef(
    new globalThis.Map<
      string,
      { feature: IntelligenceFeature; data: google.maps.Data.Feature[] }
    >(),
  );
  useEffect(() => {
    let disposed = false;
    let instance: google.maps.Map | undefined;
    const listeners: google.maps.MapsEventListener[] = [];
    let info: google.maps.InfoWindow | undefined;
    function rememberCamera() {
      const center = instance?.getCenter();
      const zoom = instance?.getZoom();
      if (center && zoom !== undefined)
        cameraChanged.current?.({ center: [center.lat(), center.lng()], zoom });
    }
    const unavailable = () => {
      if (disposed) return;
      rememberCamera();
      onUnavailable();
    };
    const timeout = setTimeout(unavailable, 20000);
    const unsubscribe = onGoogleMapsAuthFailure(unavailable);
    loadGoogleMaps(apiKey)
      .then(({ Map, InfoWindow }) => {
        if (disposed || !container.current) return;
        const camera = initial.current;
        instance = new Map(container.current, {
          center: {
            lat: (camera?.center ?? initialMapView.center)[0],
            lng: (camera?.center ?? initialMapView.center)[1],
          },
          zoom: camera?.zoom ?? initialMapView.zoom,
          minZoom: 6,
          maxZoom: 19,
          restriction: {
            latLngBounds: boundsLiteral(ghanaViewBounds),
            strictBounds: false,
          },
          mapTypeId: "satellite",
          disableDefaultUI: true,
          zoomControl: true,
          zoomControlOptions: {
            position: google.maps.ControlPosition.RIGHT_BOTTOM,
          },
          scaleControl: true,
          clickableIcons: false,
          gestureHandling: "greedy",
        });
        if (!camera)
          instance.fitBounds(boundsLiteral(ghanaCountryBounds), {
            top: 72,
            bottom: 48,
            left: 40,
            right: 40,
          });
        instance.data.addGeoJson({
          type: "Feature",
          id: focusId,
          geometry: ghanaFocusGeometry,
          properties: { focusMask: true },
        });
        listeners.push(
          google.maps.event.addListenerOnce(instance, "tilesloaded", () => {
            clearTimeout(timeout);
            if (!disposed) setReady(true);
          }),
        );
        listeners.push(
          instance.addListener("idle", () => {
            rememberCamera();
            if (!disposed) setTier(districtZoomTier(instance?.getZoom() ?? 6));
          }),
        );
        info = new InfoWindow({ disableAutoPan: true });
        listeners.push(
          instance.data.addListener(
            "mouseover",
            (event: google.maps.Data.MouseEvent) => {
              if (!featureLookup.current.has(String(event.feature.getId())))
                return;
              if (
                event.feature.getProperty("type") ===
                  "administrative_boundary" &&
                (instance?.getZoom() ?? 6) < 13
              )
                return;
              const content = document.createElement("span");
              content.textContent = String(event.feature.getProperty("title"));
              info?.setContent(content);
              info?.setPosition(event.latLng);
              info?.open(instance);
            },
          ),
        );
        listeners.push(
          instance.data.addListener("mouseout", () => info?.close()),
        );
        listeners.push(
          instance.data.addListener(
            "click",
            (event: google.maps.Data.MouseEvent) => {
              const feature = featureLookup.current.get(
                String(event.feature.getId()),
              );
              if (feature) selection.current(feature);
            },
          ),
        );
        setMap(instance);
      })
      .catch(unavailable);
    return () => {
      disposed = true;
      clearTimeout(timeout);
      unsubscribe();
      listeners.forEach((listener) => listener.remove());
      info?.close();
      instance?.data.forEach((feature) => instance?.data.remove(feature));
      rendered.current.clear();
    };
  }, [apiKey, onUnavailable]);

  useEffect(() => {
    map?.setMapTypeId(showLabels ? "hybrid" : "satellite");
  }, [map, showLabels]);
  useEffect(() => {
    if (!map) return;
    const current = rendered.current;
    const desired = new Set(features.map((feature) => feature.id));
    for (const [id, value] of current)
      if (!desired.has(id)) {
        value.data.forEach((feature) => map.data.remove(feature));
        current.delete(id);
      }
    for (const feature of features) {
      if (current.get(feature.id)?.feature === feature) continue;
      current.get(feature.id)?.data.forEach((item) => map.data.remove(item));
      const data = map.data.addGeoJson({
        type: "Feature",
        id: feature.id,
        geometry: feature.geometry,
        properties: { title: feature.properties.title, type: feature.type },
      });
      current.set(feature.id, { feature, data });
    }
  }, [map, features]);
  useEffect(() => {
    if (!map) return;
    map.data.setStyle((feature) => {
      if (String(feature.getId()) === focusId)
        return {
          clickable: false,
          strokeWeight: 0,
          fillColor: "#101a1b",
          fillOpacity: focusOpacity(tier),
          zIndex: 1,
        };
      const type = feature.getProperty("type") as IntelligenceFeature["type"];
      const selected = String(feature.getId()) === selectedFeatureId;
      const style = overlayStyle(type, selected, tier);
      return {
        visible: type !== "administrative_boundary" || tier > 0,
        strokeColor: style.color,
        strokeWeight: style.weight,
        strokeOpacity: style.opacity,
        fillColor: style.fillColor,
        fillOpacity: style.fillOpacity,
        zIndex: 2,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: selected ? 9 : 6,
          fillColor: type === "ai_candidate" ? "#8e79ac" : "#346c55",
          fillOpacity: 1,
          strokeColor: "#f5f3ed",
          strokeWeight: selected ? 3 : 1.5,
        },
      };
    });
  }, [map, selectedFeatureId, tier]);
  useEffect(() => {
    if (!map || !focusFeature) return;
    if (focusFeature.geometry.type === "Point") {
      const [lng, lat] = focusFeature.geometry.coordinates;
      map.setCenter({ lat, lng });
      map.setZoom(14);
    } else {
      map.fitBounds(boundsLiteral(featureBounds(focusFeature)), 56);
      const listener = google.maps.event.addListenerOnce(map, "idle", () => {
        const zoom = map.getZoom() ?? 9;
        if (zoom > 13 || zoom < 9) map.setZoom(Math.max(9, Math.min(13, zoom)));
      });
      return () => listener.remove();
    }
  }, [map, focusFeature]);

  return (
    <div className="relative h-full overflow-hidden">
      <div
        ref={container}
        className="h-full w-full"
        aria-label="Satellite map of Ghana"
      />
      {map && (
        <MapNavigationPanel
          onOverview={() =>
            map.fitBounds(boundsLiteral(ghanaCountryBounds), 40)
          }
          onCoordinates={(point) => {
            map.setCenter(point);
            map.setZoom(16);
          }}
        />
      )}
      <MapSourceStatus
        provider="google"
        timelineVisible={timelineVisible}
        label={
          ready
            ? `Google ${showLabels ? "Hybrid" : "Satellite"} · imagery dates vary`
            : "Loading Google satellite imagery…"
        }
      />
    </div>
  );
}
