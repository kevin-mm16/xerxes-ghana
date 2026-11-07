"use client";

import { CircleMarker, MapContainer, TileLayer } from "react-leaflet";
import type { LatLngExpression } from "leaflet";
import type { Coordinates } from "@/types";

const ghanaCenter: LatLngExpression = [7.9465, -1.0232];

export function LocationMapPreview({ coordinates }: { coordinates?: Coordinates }) {
  const center: LatLngExpression = coordinates ? [coordinates.lat, coordinates.lng] : ghanaCenter;
  return (
    <MapContainer
      key={coordinates ? `${coordinates.lat}-${coordinates.lng}` : "ghana"}
      center={center}
      zoom={coordinates ? 12 : 7}
      scrollWheelZoom={false}
      dragging={false}
      doubleClickZoom={false}
      touchZoom={false}
      zoomControl={false}
      attributionControl={false}
      className="h-full w-full"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {coordinates ? (
        <CircleMarker
          center={[coordinates.lat, coordinates.lng]}
          radius={9}
          pathOptions={{
            color: "#ffffff",
            weight: 3,
            fillColor: "#c0342a",
            fillOpacity: 0.9,
          }}
        />
      ) : null}
    </MapContainer>
  );
}
