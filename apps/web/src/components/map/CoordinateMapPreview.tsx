import { CircleMarker, MapContainer, TileLayer, Tooltip } from "react-leaflet";
import type { LatLngExpression } from "leaflet";
import type { Coordinates, SeverityLevel } from "@/types";
import { severityPinColors } from "@/utils/badges";
import { cn } from "@/utils/cn";

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
  showAttribution = false,
  title = "Coordinate map",
}: CoordinateMapPreviewProps) {
  const center: LatLngExpression = [coordinates.lat, coordinates.lng];

  return (
    <div className={cn("relative overflow-hidden rounded-2xl border border-line bg-[#dbe7df]", heightClass)}>
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
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
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
      <div className="pointer-events-none absolute left-3 top-3 rounded-lg bg-white/95 px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-muted shadow-sm">
        {title}
      </div>
    </div>
  );
}
