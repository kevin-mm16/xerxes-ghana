"use client";

import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import { DomEvent } from "leaflet";
import { MapNavigationPanel } from "./MapNavigationPanel";
import { ghanaCountryBounds } from "@/utils/map-view";

export function MapNavigation() {
  const map = useMap();
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (container.current) {
      DomEvent.disableClickPropagation(container.current);
      DomEvent.disableScrollPropagation(container.current);
    }
  }, []);
  return (
    <div ref={container}>
      <MapNavigationPanel
        onOverview={() =>
          map.fitBounds(ghanaCountryBounds, { padding: [40, 48] })
        }
        onCoordinates={(point) => map.setView([point.lat, point.lng], 16)}
      />
    </div>
  );
}
