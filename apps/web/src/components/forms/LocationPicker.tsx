"use client";

import { useState } from "react";
import { LocationMapPreview } from "@/components/map/BrowserMaps";
import type { CapturedLocation } from "@/types";
import { formatCoordinates } from "@/utils/format";

interface LocationPickerProps {
  onDetect: (location: CapturedLocation) => void;
  coordinates?: CapturedLocation;
}

export function LocationPicker({ onDetect, coordinates }: LocationPickerProps) {
  const [error, setError] = useState("");
  const [detecting, setDetecting] = useState(false);

  const detectLocation = () => {
    setError("");

    if (!navigator.geolocation) {
      setError("Browser location is unavailable. You can still describe the area manually.");
      return;
    }

    setDetecting(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setDetecting(false);
        onDetect({
          lat: Number(position.coords.latitude.toFixed(6)),
          lng: Number(position.coords.longitude.toFixed(6)),
          accuracyMeters: Math.round(position.coords.accuracy),
          capturedAt: new Date(position.timestamp).toISOString(),
          source: "browser-geolocation",
        });
      },
      () => {
        setDetecting(false);
        setError("Location permission was not granted. You can still describe the area manually.");
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 30000,
      },
    );
  };

  return (
    <div className="rounded-2xl border border-line bg-white shadow-card">
      <div className="relative h-56 overflow-hidden rounded-t-2xl bg-[#dbe7df]">
        <LocationMapPreview coordinates={coordinates} />
        <div className="absolute left-4 top-4 rounded-lg bg-white/90 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-muted">
          Capture location
        </div>
      </div>
      <div className="p-4">
        <button
          type="button"
          onClick={detectLocation}
          disabled={detecting}
          className="w-full rounded-xl border border-forest-600 bg-forest-50 px-4 py-2.5 text-sm font-bold text-forest-800 hover:bg-white"
        >
          {detecting ? "Requesting location..." : coordinates ? "Refresh location" : "Use my location"}
        </button>
        {coordinates ? (
          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950">
            <p className="font-mono">{formatCoordinates(coordinates.lat, coordinates.lng)}</p>
            <p className="mt-1">Accuracy estimate: ±{coordinates.accuracyMeters} m</p>
          </div>
        ) : null}
        {error ? <p className="mt-3 text-xs font-semibold text-alert">{error}</p> : null}
        <p className="mt-3 text-xs leading-5 text-muted">
          The server will use the capture point and its accuracy to test XERSXES coverage. Public locations will be generalized separately.
        </p>
      </div>
    </div>
  );
}
