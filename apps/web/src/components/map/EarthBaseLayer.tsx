"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TileLayer, WMSTileLayer } from "react-leaflet";
import type { WMSParams } from "leaflet";
import {
  detailImagery,
  satelliteForYear,
  type ImageryStatus,
} from "@/services/imagery";

type Provider = ImageryStatus["provider"];
export function EarthBaseLayer({
  onStateChange,
}: {
  onStateChange: (state: ImageryStatus) => void;
}) {
  const [provider, setProvider] = useState<Provider>("esri");
  const batch = useRef({ loaded: 0, failed: 0 });
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const product = satelliteForYear(new Date().getFullYear());
  const label =
    provider === "esri"
      ? "Satellite imagery | Esri / Vantor | acquisition dates vary"
      : provider === "deafrica"
        ? `Sentinel-2 fallback | ${product.date} | lower detail`
        : "Satellite imagery unavailable. Monitoring overlays remain usable.";
  const clearWatchdog = useCallback(() => {
    clearTimeout(timer.current);
  }, []);
  const advance = useCallback(() => {
    setProvider((current) =>
      current !== provider
        ? current
        : current === "esri"
          ? "deafrica"
          : "unavailable",
    );
  }, [provider]);
  const startBatch = useCallback(() => {
    batch.current = { loaded: 0, failed: 0 };
    clearWatchdog();
    timer.current = setTimeout(() => {
      if (batch.current.loaded === 0) advance();
    }, 15000);
  }, [advance, clearWatchdog]);
  useEffect(() => {
    onStateChange({
      provider,
      state: provider === "unavailable" ? "unavailable" : "loading",
      label,
    });
    if (provider !== "unavailable") startBatch();
    return clearWatchdog;
  }, [provider, label, onStateChange, startBatch, clearWatchdog]);
  const handlers = useMemo(
    () => ({
      loading: startBatch,
      tileload: () => {
        batch.current.loaded++;
        onStateChange({ provider, state: "ready", label });
      },
      tileerror: () => {
        batch.current.failed++;
      },
      load: () => {
        clearWatchdog();
        // Wait for a complete failed batch. A couple of missing tiles must not
        // discard successful high-resolution images that are already on screen.
        if (batch.current.loaded === 0 && batch.current.failed > 0) advance();
      },
    }),
    [provider, label, startBatch, clearWatchdog, advance, onStateChange],
  );
  if (provider === "unavailable") return null;
  if (provider === "esri")
    return (
      <TileLayer
        key="esri"
        url={detailImagery.url}
        attribution={detailImagery.attribution}
        maxNativeZoom={detailImagery.maxNativeZoom}
        updateWhenIdle
        keepBuffer={2}
        eventHandlers={handlers}
      />
    );
  const params: WMSParams & { time: string } = {
    layers: product.layer,
    styles: product.style,
    format: "image/png",
    transparent: false,
    version: "1.3.0",
    time: product.date,
  };
  return (
    <WMSTileLayer
      key={product.date}
      url={product.endpoint}
      params={params}
      maxNativeZoom={14}
      updateWhenIdle
      keepBuffer={2}
      attribution='Digital Earth Africa | Copernicus Sentinel-2 | <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>'
      eventHandlers={handlers}
    />
  );
}
