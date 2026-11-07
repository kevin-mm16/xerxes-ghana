"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CaptureLocation, CoverageResult } from "@/types/api";
import { checkCoverage } from "@/services/api";

export interface LocationState {
  status: "idle" | "locating" | "checking" | "complete" | "error";
  capture?: CaptureLocation;
  result?: CoverageResult;
  error?: string;
}
export function useLocationCoverage() {
  const [state, setState] = useState<LocationState>({ status: "idle" });
  const generation = useRef(0);
  useEffect(
    () => () => {
      generation.current++;
    },
    [],
  );
  const reset = useCallback(() => {
    generation.current++;
    setState({ status: "idle" });
  }, []);
  const locate = useCallback(() => {
    const request = ++generation.current;
    if (!navigator.geolocation) {
      setState({
        status: "error",
        error: "Location is unavailable. Use a manual location instead.",
      });
      return;
    }
    setState({ status: "locating" });
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        if (generation.current !== request) return;
        const capture: CaptureLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracyMeters: position.coords.accuracy,
          capturedAt: new Date(position.timestamp).toISOString(),
          source: "browser-geolocation",
        };
        setState({ status: "checking", capture });
        try {
          const result = await checkCoverage(capture);
          if (generation.current === request)
            setState({ status: "complete", capture, result });
        } catch (error) {
          if (generation.current === request)
            setState({ status: "error", error: (error as Error).message });
        }
      },
      () => {
        if (generation.current === request)
          setState({
            status: "error",
            error:
              "Location could not be obtained. Retry or use a manual location.",
          });
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  }, []);
  return { state, locate, reset };
}
