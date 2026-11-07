"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { TileLayer, WMSTileLayer } from "react-leaflet";
import type { WMSParams } from "leaflet";
import { satelliteForYear } from "@/services/imagery";

export function EarthBaseLayer({
  year,
  onSourceChange,
}: {
  year: number;
  onSourceChange: (label: string) => void;
}) {
  const [provider, setProvider] = useState<"deafrica" | "esri" | "unavailable">(
    "deafrica",
  );
  const loaded = useRef(false);
  const failures = useRef(0);
  const product = satelliteForYear(year);
  useEffect(() => {
    loaded.current = false;
    failures.current = 0;
    onSourceChange(
      provider === "deafrica"
        ? `Sentinel-2 composite | ${product.date} | Digital Earth Africa`
        : provider === "esri"
          ? "Satellite fallback | Esri (not linked to selected year)"
          : "Satellite imagery unavailable; monitoring overlays remain usable.",
    );
    if (provider === "unavailable") return;
    const timeout = setTimeout(() => {
      if (!loaded.current)
        setProvider(provider === "deafrica" ? "esri" : "unavailable");
    }, 15000);
    return () => clearTimeout(timeout);
  }, [provider, product.date, onSourceChange]);
  const handlers = useMemo(
    () => ({
      tileload: () => {
        loaded.current = true;
      },
      tileerror: () => {
        if (++failures.current >= 2)
          setProvider((current) =>
            current === provider
              ? provider === "deafrica"
                ? "esri"
                : "unavailable"
              : current,
          );
      },
    }),
    [provider],
  );
  if (provider === "unavailable") return null;
  if (provider === "esri")
    return (
      <TileLayer
        key="esri"
        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        attribution='Source: <a href="https://www.arcgis.com/home/item.html?id=10df2279f9684e4a9f6a7f08febac2a9">Esri, Vantor, Earthstar Geographics, GIS User Community</a>'
        eventHandlers={handlers}
      />
    );
  const params: WMSParams & { time: string } = {
    layers: product.layer,
    styles: product.style,
    format: "image/png",
    transparent: false,
    version: "1.3.0",
    time: product.date,
  };
  return (
    <WMSTileLayer
      key={product.date}
      url={product.endpoint}
      params={params}
      attribution='Digital Earth Africa | Copernicus Sentinel-2 | <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a>'
      eventHandlers={handlers}
    />
  );
}
