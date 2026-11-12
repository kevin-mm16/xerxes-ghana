"use client";

import { useEffect, useRef, useState } from "react";
import type { IntelligenceFeature, MapLayerKey } from "@/types/intelligence";
import { getMapFeatures, type MapFeatureQuery } from "@/services/map-data";

export interface MapFeatureOptions extends MapFeatureQuery {
  enabled?: boolean;
  debounceMs?: number;
}

/** Public data only. Renderers report extents; this boundary owns request timing. */
export function useMapFeatures(
  options: MapFeatureOptions | MapLayerKey | "all" = "all",
) {
  const legacy = typeof options === "string";
  const enabled = legacy || options.enabled !== false;
  const debounceMs = legacy ? 0 : (options.debounceMs ?? 250);
  const key = legacy
    ? options
    : JSON.stringify({
        bbox: options.bbox,
        layers: [...options.layers].sort(),
      });
  const hasLayers = legacy || options.layers.length > 0;
  const [features, setFeatures] = useState<IntelligenceFeature[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(enabled && hasLayers);
  const [truncated, setTruncated] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const generation = useRef(0);
  useEffect(() => {
    const current = ++generation.current;
    const controller = new AbortController();
    setError("");
    if (!enabled || !hasLayers) {
      setFeatures([]);
      setTruncated(false);
      setLoading(false);
      return () => controller.abort();
    }
    setLoading(true);
    const query = legacy
      ? (key as MapLayerKey | "all")
      : (JSON.parse(key) as MapFeatureQuery);
    const timer = setTimeout(() => {
      getMapFeatures(controller.signal, query)
        .then((data) => {
          if (!controller.signal.aborted && generation.current === current) {
            setFeatures(data.features);
            setTruncated(data.truncated);
          }
        })
        .catch((reason) => {
          if (!controller.signal.aborted && generation.current === current) {
            setError(
              reason instanceof Error
                ? reason.message
                : "Public map data is unavailable.",
            );
            setFeatures([]);
          }
        })
        .finally(() => {
          if (!controller.signal.aborted && generation.current === current)
            setLoading(false);
        });
    }, debounceMs);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [attempt, key, enabled, hasLayers, debounceMs, legacy]);
  return {
    features,
    error,
    loading,
    truncated,
    retry: () => setAttempt((value) => value + 1),
  };
}
