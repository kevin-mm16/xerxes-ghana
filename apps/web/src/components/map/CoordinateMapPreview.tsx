"use client";

import { useMemo, useState } from "react";
import { CircleMarker, MapContainer, Tooltip } from "react-leaflet";
import type { LatLngExpression } from "leaflet";
import type { Coordinates, SeverityLevel } from "@/types";
import { severityPinColors } from "@/utils/badges";
import { cn } from "@/utils/cn";
import { EarthBaseLayer } from "./EarthBaseLayer";
import type { ImageryStatus } from "@/services/imagery";

interface CoordinateMapPreviewProps {
  coordinates: Coordinates;
  label: string;
  severity?: SeverityLevel;
  zoom?: number;
  heightClass?: string;
  interactive?: boolean;
  showAttribution?: boolean;
  title?: string;
}

export function CoordinateMapPreview({
  coordinates,
  label,
  severity = "Medium",
  zoom = 10,
  heightClass = "h-56",
  interactive = false,
  showAttribution = true,
  title = "Coordinate map",
}: CoordinateMapPreviewProps) {
  const center = useMemo<LatLngExpression>(
    () => [coordinates.lat, coordinates.lng],
    [coordinates.lat, coordinates.lng],
  );
  const [imagery, setImagery] = useState<ImageryStatus>();

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded border border-line bg-[#172021]",
        heightClass,
      )}
    >
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom={interactive}
        dragging={interactive}
        doubleClickZoom={interactive}
        touchZoom={interactive}
        zoomControl={interactive}
        attributionControl={showAttribution}
        className="h-full w-full"
      >
        <EarthBaseLayer onStateChange={setImagery} />
        <CircleMarker
          center={center}
          radius={9}
          pathOptions={{
            color: "#ffffff",
            weight: 3,
            fillColor: severityPinColors[severity],
            fillOpacity: 0.92,
          }}
        >
          <Tooltip direction="top" offset={[0, -6]} opacity={0.95}>
            <span className="text-xs font-semibold">{label}</span>
          </Tooltip>
        </CircleMarker>
      </MapContainer>
      <div className="pointer-events-none absolute left-2 top-2 rounded border border-line bg-paper/95 px-2 py-1 font-mono text-[9px] font-medium uppercase tracking-[0.1em] text-muted">
        {title}
      </div>
      {imagery?.state === "unavailable" && (
        <p
          role="status"
          className="absolute bottom-6 left-2 bg-paper px-2 py-1 text-[10px] text-muted"
        >
          Satellite imagery unavailable
        </p>
      )}
    </div>
  );
}
