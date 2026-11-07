"use client";

import { useMemo, useState } from "react";
import type { MapLayerKey, MapLayerState } from "@/types/intelligence";
import { useMapFeatures } from "@/hooks/useMapFeatures";
import { HotspotMap } from "./BrowserMaps";
import { IntelligenceDrawer } from "./IntelligenceDrawer";
import { MapFilters, type MapFilterState } from "./MapFilters";
import { MapLayerControl } from "./MapLayerControl";
import { TimelineControl } from "./TimelineControl";

const defaultFilters: MapFilterState = { search: "", dateRange: "All" };
// The initial workspace is unlabelled satellite imagery. Reviewed overlays are opt-in.
const defaultLayers: MapLayerState = {
  coverage: false,
  observations: false,
  ai: false,
  satellite: false,
};

export function MapExplorer({
  variant = "workspace",
}: {
  variant?: "workspace" | "preview";
}) {
  const data = useMapFeatures();
  const [filters, setFilters] = useState(defaultFilters);
  const [layers, setLayers] = useState(defaultLayers);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [layersOpen, setLayersOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string>();
  const [selectedYear, setSelectedYear] = useState(() =>
    new Date().getFullYear(),
  );
  const compact = variant === "preview";
  const features = useMemo(
    () =>
      data.features.filter((feature) => {
        if (!layers[feature.properties.layer]) return false;
        if (
          feature.observedAt &&
          Number(feature.observedAt.slice(0, 4)) !== selectedYear
        )
          return false;
        const search = filters.search.toLowerCase().trim();
        if (
          search &&
          ![
            feature.properties.title,
            feature.properties.coverageCode,
            feature.properties.summary,
            feature.properties.publicLabel,
          ]
            .join(" ")
            .toLowerCase()
            .includes(search)
        )
          return false;
        if (feature.observedAt && filters.dateRange !== "All") {
          const days =
            filters.dateRange === "Last 7 days"
              ? 7
              : filters.dateRange === "Last 30 days"
                ? 30
                : 90;
          const age = Date.now() - Date.parse(feature.observedAt);
          if (age < 0 || age > days * 86400000) return false;
        }
        return true;
      }),
    [data.features, filters, layers, selectedYear],
  );
  const counts = useMemo(() => {
    const result: Record<MapLayerKey, number> = {
      coverage: 0,
      observations: 0,
      ai: 0,
      satellite: 0,
    };
    for (const feature of data.features) result[feature.properties.layer]++;
    return result;
  }, [data.features]);
  const selected = features.find((feature) => feature.id === selectedId);
  const years = Array.from(
    { length: Math.max(1, new Date().getFullYear() - 2016) },
    (_, index) => index + 2017,
  );
  return (
    <div
      className={
        compact
          ? "relative overflow-hidden rounded-3xl border border-line bg-[#17251d] shadow-card"
          : "relative h-[calc(100dvh-104px)] min-h-[420px] overflow-hidden bg-[#17251d]"
      }
    >
      <HotspotMap
        imageryYear={selectedYear}
        features={features}
        selectedFeatureId={selectedId}
        onSelectFeature={(feature) => setSelectedId(feature.id)}
        compact={compact}
      />
      <div className="absolute left-3 top-3 z-[600] flex max-w-[calc(100%-1.5rem)] flex-wrap gap-2">
        {!compact && (
          <button
            type="button"
            aria-expanded={filtersOpen}
            onClick={() => {
              setFiltersOpen(!filtersOpen);
              setLayersOpen(false);
            }}
            className="rounded-xl bg-white/95 px-4 py-2.5 text-sm font-bold shadow-lift"
          >
            Filters
          </button>
        )}
        <button
          type="button"
          aria-expanded={layersOpen}
          aria-controls="map-layers"
          onClick={() => {
            setLayersOpen(!layersOpen);
            setFiltersOpen(false);
          }}
          className="rounded-xl bg-white/95 px-4 py-2.5 text-sm font-bold shadow-lift"
        >
          Layers
        </button>
        {data.loading && (
          <span role="status" className="rounded-xl bg-white/95 p-3 text-xs">
            Loading monitoring data...
          </span>
        )}
        {data.error && (
          <div
            role="alert"
            className="max-w-64 rounded-xl bg-white/95 p-3 text-xs"
          >
            Monitoring data unavailable.{" "}
            <button
              type="button"
              onClick={data.retry}
              className="font-bold underline"
            >
              Retry
            </button>
          </div>
        )}
        {data.truncated && (
          <span className="rounded-xl bg-white/95 p-3 text-xs">
            Some features are omitted by the service limit.
          </span>
        )}
      </div>
      {filtersOpen && (
        <div className="absolute left-3 top-16 z-[640] max-h-[50dvh] w-[min(300px,calc(100%-1.5rem))] overflow-y-auto">
          <MapFilters
            filters={filters}
            onChange={setFilters}
            onReset={() => setFilters(defaultFilters)}
          />
        </div>
      )}
      {layersOpen && (
        <div className="absolute left-3 top-16 z-[640]">
          <MapLayerControl
            layers={layers}
            onChange={setLayers}
            counts={counts}
          />
        </div>
      )}
      {!compact && (
        <div className="absolute bottom-3 left-3 right-3 z-[600] lg:right-[408px]">
          <TimelineControl
            years={years}
            selectedYear={selectedYear}
            onSelect={setSelectedYear}
          />
        </div>
      )}
      <IntelligenceDrawer
        feature={selected}
        onClose={() => setSelectedId(undefined)}
      />
    </div>
  );
}
