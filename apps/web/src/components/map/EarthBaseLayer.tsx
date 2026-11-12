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
export type TileImageryStatus = ImageryStatus & { degraded?: boolean };
export function EarthBaseLayer({
  onStateChange,
}: {
  onStateChange: (state: TileImageryStatus) => void;
}) {
  const [provider, setProvider] = useState<Provider>("esri");
  const batch = useRef({ loaded: 0, failed: 0 });
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const failedTiles = useRef(new Set<HTMLImageElement>());
  const retryCounts = useRef(new WeakMap<HTMLImageElement, number>());
  const retryTimers = useRef(
    new Map<HTMLImageElement, ReturnType<typeof setTimeout>>(),
  );
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
  const clearRetries = useCallback(() => {
    retryTimers.current.forEach(clearTimeout);
    retryTimers.current.clear();
    failedTiles.current.clear();
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
    clearRetries();
    clearWatchdog();
    timer.current = setTimeout(() => {
      if (batch.current.loaded === 0) advance();
    }, 15000);
  }, [advance, clearWatchdog, clearRetries]);
  useEffect(() => {
    onStateChange({
      provider,
      state: provider === "unavailable" ? "unavailable" : "loading",
      label,
    });
    if (provider !== "unavailable") startBatch();
    return () => {
      clearWatchdog();
      clearRetries();
    };
  }, [provider, label, onStateChange, startBatch, clearWatchdog, clearRetries]);
  const handlers = useMemo(
    () => ({
      loading: startBatch,
      tileload: (event?: { tile?: HTMLElement }) => {
        batch.current.loaded++;
        if (event?.tile instanceof HTMLImageElement)
          failedTiles.current.delete(event.tile);
        // One ready transition per batch, rather than one React update per tile.
        if (batch.current.loaded === 1)
          onStateChange({ provider, state: "ready", label });
      },
      tileerror: (event?: { tile?: HTMLElement }) => {
        batch.current.failed++;
        if (event?.tile instanceof HTMLImageElement)
          failedTiles.current.add(event.tile);
      },
      load: () => {
        clearWatchdog();
        // Wait for a complete failed batch. A couple of missing tiles must not
        // discard successful high-resolution images that are already on screen.
        if (batch.current.loaded === 0 && batch.current.failed > 0) {
          advance();
          return;
        }
        if (batch.current.loaded > 0 && batch.current.failed > 0) {
          onStateChange({
            provider,
            state: "ready",
            label,
            degraded: failedTiles.current.size > 0,
          });
          // Retry only transient holes in an otherwise usable batch. Keep good
          // tiles in place, stagger requests, and cap each image at two retries.
          [...failedTiles.current].forEach((tile, index) => {
            const attempts = retryCounts.current.get(tile) ?? 0;
            if (
              attempts >= 2 ||
              retryTimers.current.has(tile) ||
              !tile.isConnected
            )
              return;
            retryCounts.current.set(tile, attempts + 1);
            retryTimers.current.set(
              tile,
              setTimeout(
                () => {
                  retryTimers.current.delete(tile);
                  if (tile.isConnected && failedTiles.current.has(tile))
                    tile.src = tile.src;
                },
                (attempts + 1) * 600 + index * 100,
              ),
            );
          });
        }
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
