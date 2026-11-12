"use client";

import { useState } from "react";
import { TileLayer } from "react-leaflet";
import { EarthBaseLayer, type TileImageryStatus } from "./EarthBaseLayer";
import { MapSourceStatus } from "./MapSourceStatus";
import { placeLabels } from "@/services/imagery";

// Raster progress is deliberately local. It must never rerender vector geometry.
export function SatelliteLayers({
  showLabels,
  timelineVisible,
}: {
  showLabels: boolean;
  timelineVisible: boolean;
}) {
  const [imagery, setImagery] = useState<TileImageryStatus>();
  const [labelsFailed, setLabelsFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  return (
    <>
      <EarthBaseLayer key={attempt} onStateChange={setImagery} />
      {showLabels && (
        <>
          <TileLayer
            url={placeLabels.transportUrl}
            maxNativeZoom={19}
            zIndex={399}
            opacity={0.8}
            updateWhenIdle
            eventHandlers={{ tileerror: () => setLabelsFailed(true) }}
          />
          <TileLayer
            url={placeLabels.url}
            attribution={placeLabels.attribution}
            maxNativeZoom={19}
            zIndex={400}
            opacity={0.85}
            updateWhenIdle
            eventHandlers={{ tileerror: () => setLabelsFailed(true) }}
          />
        </>
      )}
      <MapSourceStatus
        provider={imagery?.provider ?? "esri"}
        timelineVisible={timelineVisible}
        label={imagery?.label ?? "Loading satellite imagery…"}
      >
        {showLabels && (
          <span>
            {labelsFailed ? " · Some labels unavailable" : " · Esri labels"}
          </span>
        )}
        {imagery?.degraded && <span> · Some satellite tiles unavailable</span>}
        {(imagery?.state === "unavailable" || imagery?.degraded) && (
          <button
            type="button"
            onClick={() => setAttempt((value) => value + 1)}
            className="ml-2 min-h-8 px-1 font-semibold text-white underline"
          >
            Retry imagery
          </button>
        )}
      </MapSourceStatus>
    </>
  );
}
