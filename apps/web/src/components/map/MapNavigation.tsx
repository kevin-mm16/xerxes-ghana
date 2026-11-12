"use client";

import { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import { DomEvent } from "leaflet";
import { MapNavigationPanel } from "./MapNavigationPanel";
import { ghanaViewBounds } from "@/utils/map-view";

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
        onOverview={() => map.fitBounds(ghanaViewBounds, { padding: [24, 24] })}
        onCoordinates={(point) => map.setView([point.lat, point.lng], 16)}
      />
    </div>
  );
}
