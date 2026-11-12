"use client";

import { useCallback, useState, type FormEvent } from "react";
import { Button, Icon, Input } from "@/components/ui";
import { parseMapCoordinates } from "@/utils/map-view";
import { MapPanel } from "./MapPanel";

export function MapNavigationPanel({
  onOverview,
  onCoordinates,
}: {
  onOverview: () => void;
  onCoordinates: (point: { lat: number; lng: number }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [error, setError] = useState("");
  const close = useCallback(() => setOpen(false), []);
  function go(event: FormEvent) {
    event.preventDefault();
    try {
      onCoordinates(parseMapCoordinates(latitude, longitude));
      setOpen(false);
      setError("");
    } catch (reason) {
      setError((reason as Error).message);
    }
  }
  return (
    <div
      onKeyDown={(event) => event.stopPropagation()}
      className="pointer-events-none absolute inset-0 z-[620]"
    >
      <div className="pointer-events-auto absolute right-3 top-16 flex gap-1.5 sm:top-3">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={onOverview}
          aria-label="Show Ghana overview"
          title="Recenter Ghana"
          className="h-11 min-h-11 gap-2 bg-paper/95 sm:h-10 sm:min-h-10"
        >
          <Icon name="locate" className="h-4 w-4" /> Ghana
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          aria-expanded={open}
          aria-controls="map-coordinates"
          onClick={() => setOpen(!open)}
          className="h-11 min-h-11 gap-2 bg-paper/95 sm:h-10 sm:min-h-10"
        >
          <Icon name="crosshair" className="h-4 w-4" /> Coordinates
        </Button>
      </div>
      {open && (
        <div className="pointer-events-auto [&>section]:sm:left-auto [&>section]:sm:right-3">
          <MapPanel
            title="Go to coordinates"
            id="map-coordinates"
            onClose={close}
          >
            <form onSubmit={go} className="space-y-4">
              <p className="text-xs leading-5 text-muted">
                Inspect a location within the Ghana workspace. This does not
                submit an observation.
              </p>
              <label className="block text-sm font-medium">
                Latitude
                <Input
                  type="number"
                  step="any"
                  inputMode="decimal"
                  value={latitude}
                  onChange={(event) => setLatitude(event.target.value)}
                  placeholder="5.43"
                  className="mt-1.5 w-full"
                />
              </label>
              <label className="block text-sm font-medium">
                Longitude
                <Input
                  type="number"
                  step="any"
                  inputMode="decimal"
                  value={longitude}
                  onChange={(event) => setLongitude(event.target.value)}
                  placeholder="-2.15"
                  className="mt-1.5 w-full"
                />
              </label>
              {error && (
                <p role="alert" className="text-xs text-alert">
                  {error}
                </p>
              )}
              <Button type="submit" className="w-full">
                Go to coordinates
              </Button>
            </form>
          </MapPanel>
        </div>
      )}
    </div>
  );
}
