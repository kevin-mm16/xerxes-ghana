"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useMap } from "react-leaflet";
import { DomEvent } from "leaflet";
import { ghanaViewBounds, parseMapCoordinates } from "@/utils/map-view";

export function MapNavigation() {
  const map = useMap();
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (container.current) {
      DomEvent.disableClickPropagation(container.current);
      DomEvent.disableScrollPropagation(container.current);
    }
  }, []);
  const [open, setOpen] = useState(false);
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [error, setError] = useState("");
  function go(event: FormEvent) {
    event.preventDefault();
    try {
      const point = parseMapCoordinates(latitude, longitude);
      map.setView([point.lat, point.lng], 16);
      setOpen(false);
      setError("");
    } catch (reason) {
      setError((reason as Error).message);
    }
  }
  return (
    <div
      ref={container}
      onKeyDown={(event) => event.stopPropagation()}
      className="absolute right-3 top-3 z-[620]"
    >
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => map.fitBounds(ghanaViewBounds, { padding: [24, 24] })}
          className="rounded-xl bg-white/95 px-3 py-2.5 text-sm font-bold shadow-lift"
          aria-label="Show Ghana overview"
        >
          Ghana
        </button>
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
          className="rounded-xl bg-white/95 px-3 py-2.5 text-sm font-bold shadow-lift"
        >
          Coordinates
        </button>
      </div>
      {open && (
        <form
          onSubmit={go}
          className="mt-2 w-60 max-w-[calc(100vw-1.5rem)] space-y-3 rounded-2xl border border-line bg-white p-4 shadow-lift"
        >
          <label className="block text-sm font-semibold">
            Latitude
            <input
              type="number"
              step="any"
              inputMode="decimal"
              value={latitude}
              onChange={(event) => setLatitude(event.target.value)}
              placeholder="5.43"
              className="mt-1 h-10 w-full rounded-lg border border-line px-3"
            />
          </label>
          <label className="block text-sm font-semibold">
            Longitude
            <input
              type="number"
              step="any"
              inputMode="decimal"
              value={longitude}
              onChange={(event) => setLongitude(event.target.value)}
              placeholder="-2.15"
              className="mt-1 h-10 w-full rounded-lg border border-line px-3"
            />
          </label>
          {error && (
            <p role="alert" className="text-xs text-alert">
              {error}
            </p>
          )}
          <button
            type="submit"
            className="w-full rounded-lg bg-forest-800 px-3 py-2 text-sm font-bold text-white"
          >
            Go to coordinates
          </button>
        </form>
      )}
    </div>
  );
}
