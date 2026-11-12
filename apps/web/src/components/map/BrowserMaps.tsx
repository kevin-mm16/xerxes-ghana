"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import type { IntelligenceMapProps } from "./map-props";
import type { MapCamera } from "@/utils/map-view";

// Leaflet reads browser globals when imported. Keep this boundary at the maps
// so page headings, content, navigation, and forms can still render on the server.
function MapLoading() {
  return (
    <p
      role="status"
      className="flex h-full min-h-64 items-center justify-center bg-[#172021] p-6 text-sm text-white/60"
    >
      Loading map...
    </p>
  );
}

export const CoordinateMapPreview = dynamic(
  () =>
    import("./CoordinateMapPreview").then(
      (module) => module.CoordinateMapPreview,
    ),
  { ssr: false, loading: MapLoading },
);

const SatelliteMap = dynamic(
  () => import("./HotspotMap").then((module) => module.HotspotMap),
  { ssr: false, loading: MapLoading },
);

const GoogleMap = dynamic(
  () =>
    import("./GoogleIntelligenceMap").then(
      (module) => module.GoogleIntelligenceMap,
    ),
  { ssr: false, loading: MapLoading },
);

export function HotspotMap(props: IntelligenceMapProps) {
  const [key, setKey] = useState<string>();
  const [checked, setChecked] = useState(false);
  const [failed, setFailed] = useState(false);
  const camera = useRef<MapCamera | undefined>(props.initialCamera);
  const onCameraChange = useCallback(
    (next: MapCamera) => {
      camera.current = next;
      props.onCameraChange?.(next);
    },
    [props.onCameraChange],
  );
  const unavailable = useCallback(() => setFailed(true), []);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    fetch("/api/map-config", { signal: controller.signal, cache: "no-store" })
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((config) => {
        if (!controller.signal.aborted)
          setKey(config.googleMapsApiKey || undefined);
      })
      .catch(() => {})
      .finally(() => {
        clearTimeout(timeout);
        if (active) setChecked(true);
      });
    return () => {
      active = false;
      clearTimeout(timeout);
      controller.abort();
    };
  }, []);
  if (!checked) return <MapLoading />;
  if (key && !failed)
    return (
      <GoogleMap
        {...props}
        initialCamera={camera.current}
        onCameraChange={onCameraChange}
        apiKey={key}
        onUnavailable={unavailable}
      />
    );
  return (
    <SatelliteMap
      {...props}
      initialCamera={camera.current}
      onCameraChange={onCameraChange}
    />
  );
}
