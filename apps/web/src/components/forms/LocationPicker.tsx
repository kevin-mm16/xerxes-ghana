"use client";

import { useState } from "react";
import { LocationMapPreview } from "@/components/map/BrowserMaps";
import type { Coordinates } from "@/types";
import { formatCoordinates } from "@/utils/format";

interface LocationPickerProps {
  onDetect: (coordinates: Coordinates) => void;
  coordinates?: Coordinates;
}

export function LocationPicker({ onDetect, coordinates }: LocationPickerProps) {
  const [error, setError] = useState("");
  const [detecting, setDetecting] = useState(false);

  const detectLocation = () => {
    setError("");

    if (!navigator.geolocation) {
      setError("Browser geolocation is not available. Use manual location text instead.");
      return;
    }

    setDetecting(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setDetecting(false);
        onDetect({
          lat: Number(position.coords.latitude.toFixed(5)),
          lng: Number(position.coords.longitude.toFixed(5)),
        });
      },
      () => {
        setDetecting(false);
        setError("Location permission was not granted. Use manual location text instead.");
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 60000,
      },
    );
  };

  return (
    <div className="rounded-2xl border border-line bg-white shadow-card">
      <div className="relative h-60 overflow-hidden rounded-t-2xl bg-[#dbe7df]">
        <LocationMapPreview coordinates={coordinates} />
        <div className="absolute left-4 top-4 rounded-lg bg-white/90 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
          Approximate location preview
        </div>
      </div>
      <div className="p-4">
        <button
          type="button"
          onClick={detectLocation}
          disabled={detecting}
          className="w-full rounded-xl border border-forest-600 bg-forest-50 px-4 py-2.5 text-sm font-bold text-forest-800 hover:bg-white"
        >
          {detecting ? "Requesting location..." : coordinates ? "Refresh browser location" : "Use browser location"}
        </button>
        {coordinates ? (
          <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 font-mono text-xs text-amber-950">
            Local coordinate preview: {formatCoordinates(coordinates.lat, coordinates.lng)}
          </p>
        ) : null}
        {error ? <p className="mt-3 text-xs font-semibold text-alert">{error}</p> : null}
        <p className="mt-3 text-xs leading-5 text-muted">
          Browser location is requested only after you click. It remains local on this frontend until backend submission
          and privacy controls are implemented.
        </p>
      </div>
    </div>
  );
}
