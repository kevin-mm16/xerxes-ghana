"use client";

import { useMemo, useState } from "react";
import { circleMarker, geoJSON } from "leaflet";
import { GeoJSON, MapContainer, Tooltip } from "react-leaflet";
import { EarthBaseLayer } from "@/components/map/EarthBaseLayer";
import type { ImageryStatus } from "@/services/imagery";
import type { PublicLocationMapProps } from "./PublicLocationMap";

export function PublicLocationMapCanvas({
  geometry,
  label,
}: PublicLocationMapProps) {
  const bounds = useMemo(() => geoJSON(geometry).getBounds(), [geometry]);
  const [imagery, setImagery] = useState<ImageryStatus>({
    provider: "esri",
    state: "loading",
    label: "Loading satellite imagery...",
  });
  if (!bounds.isValid())
    return (
      <p className="border border-line p-5 text-sm text-muted">
        The public location map is unavailable.
      </p>
    );
  return (
    <div>
      <div
        className="record-location-map"
        role="region"
        aria-label="Generalized public location map"
      >
        <MapContainer
          bounds={bounds}
          boundsOptions={{ padding: [28, 28], maxZoom: 12 }}
          scrollWheelZoom={false}
          dragging={false}
          doubleClickZoom={false}
          touchZoom={false}
          zoomControl={false}
          keyboard={false}
          attributionControl
          className="h-full w-full"
        >
          <EarthBaseLayer onStateChange={setImagery} />
          <GeoJSON
            data={geometry}
            style={{
              color: "#a99977",
              weight: 1.5,
              fillColor: "#a99977",
              fillOpacity: 0.05,
            }}
            pointToLayer={(_, point) =>
              circleMarker(point, {
                radius: 6,
                color: "#fbfcf8",
                weight: 2,
                fillColor: "#346c55",
                fillOpacity: 1,
              })
            }
          >
            <Tooltip>{label} / generalized public location</Tooltip>
          </GeoJSON>
        </MapContainer>
      </div>
      <p role="status" className="mt-2 text-[10px] leading-5 text-muted">
        {imagery.label}
      </p>
    </div>
  );
}
