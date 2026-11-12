"use client";

import { useEffect, useState } from "react";
import {
  Circle,
  CircleMarker,
  GeoJSON,
  MapContainer,
  Tooltip,
  useMap,
  useMapEvents,
} from "react-leaflet";
import { EarthBaseLayer } from "@/components/map/EarthBaseLayer";
import type { TileImageryStatus } from "@/components/map/EarthBaseLayer";
import type { ModerationObservation } from "@/types/moderation";
import type { IntelligenceGeometry } from "@/types/intelligence";

export interface ReviewedLocationMapProps {
  point?: [number, number];
  existingGeometry?: IntelligenceGeometry;
  capture: ModerationObservation["captureLocation"];
  showCapture: boolean;
  focus?: { latitude: number; longitude: number; nonce: number };
  disabled: boolean;
  onPoint: (point: [number, number]) => void;
}
function Interaction({
  onPoint,
  disabled,
  focus,
}: Pick<ReviewedLocationMapProps, "onPoint" | "disabled" | "focus">) {
  const map = useMap();
  useMapEvents({
    click(event) {
      if (!disabled) onPoint([event.latlng.lng, event.latlng.lat]);
    },
  });
  useEffect(() => {
    if (focus) map.setView([focus.latitude, focus.longitude], 12);
  }, [focus, map]);
  return null;
}
export default function ReviewedLocationMapCanvas({
  point,
  existingGeometry,
  capture,
  showCapture,
  disabled,
  onPoint,
  focus,
}: ReviewedLocationMapProps) {
  const [imagery, setImagery] = useState<TileImageryStatus>();
  return (
    <div>
      <div
        className="h-[320px] overflow-hidden rounded-[4px] border border-line"
        role="region"
        aria-label="Private reviewed activity location map"
      >
        <MapContainer
          bounds={[
            [4.5, -3.3],
            [11.2, 1.25],
          ]}
          boundsOptions={{ padding: [12, 12] }}
          className="h-full w-full"
          scrollWheelZoom
          zoomControl
          attributionControl
        >
          <EarthBaseLayer onStateChange={setImagery} />
          <Interaction onPoint={onPoint} disabled={disabled} focus={focus} />
          {existingGeometry && existingGeometry.type !== "Point" && (
            <GeoJSON
              data={existingGeometry}
              style={{ color: "#346c55", weight: 1.5, fillOpacity: 0.08 }}
            >
              <Tooltip>Existing reviewed activity geometry</Tooltip>
            </GeoJSON>
          )}
          {point && (
            <CircleMarker
              center={[point[1], point[0]]}
              radius={8}
              pathOptions={{
                color: "#f5f3ed",
                weight: 2,
                fillColor: "#346c55",
                fillOpacity: 1,
              }}
            >
              <Tooltip>
                Reviewed activity point — saved separately from device capture
              </Tooltip>
            </CircleMarker>
          )}
          {showCapture && capture && (
            <>
              <Circle
                center={[capture.latitude, capture.longitude]}
                radius={capture.accuracyMeters}
                pathOptions={{ color: "#b7a573", weight: 1, fillOpacity: 0.08 }}
              />
              <CircleMarker
                center={[capture.latitude, capture.longitude]}
                radius={5}
                pathOptions={{
                  color: "#f5f3ed",
                  weight: 1.5,
                  fillColor: "#ad8237",
                  fillOpacity: 1,
                }}
              >
                <Tooltip>
                  Private device capture position — not the activity location
                </Tooltip>
              </CircleMarker>
            </>
          )}
        </MapContainer>
      </div>
      <p role="status" className="mt-2 text-[10px] leading-5 text-muted">
        {imagery?.label ?? "Loading satellite context…"}
        {imagery?.degraded ? " · Some map tiles unavailable" : ""}
      </p>
    </div>
  );
}
