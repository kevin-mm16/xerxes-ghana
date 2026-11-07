"use client";

import { useEffect, useState } from "react";
import type { IntelligenceFeature } from "@/types/intelligence";
import { getMapFeatures } from "@/services/map-data";

export function useMapFeatures() {
  const [features, setFeatures] = useState<IntelligenceFeature[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [truncated, setTruncated] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    getMapFeatures(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) {
          setFeatures(data.features);
          setTruncated(data.truncated);
        }
      })
      .catch((reason) => {
        if (!controller.signal.aborted) {
          setError(reason.message);
          setFeatures([]);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [attempt]);
  return {
    features,
    error,
    loading,
    truncated,
    retry: () => setAttempt((value) => value + 1),
  };
}
