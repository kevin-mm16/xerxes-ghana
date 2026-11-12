"use client";

import { useCallback, useMemo, useState } from "react";
import { Button, Icon, Input } from "@/components/ui";
import type {
  IntelligenceFeature,
  MapLayerKey,
  MapLayerState,
} from "@/types/intelligence";
import { useMapFeatures } from "@/hooks/useMapFeatures";
import { districtMinimumZoom, type MapViewport } from "@/utils/map-view";
import { HotspotMap } from "./BrowserMaps";
import { IntelligenceDrawer } from "./IntelligenceDrawer";
import { MapFilters, type MapFilterState } from "./MapFilters";
import { MapLayerControl } from "./MapLayerControl";
import { MapPanel } from "./MapPanel";
import { TimelineControl } from "./TimelineControl";

const defaultFilters: MapFilterState = { search: "", dateRange: "All" };
const defaultLayers: MapLayerState = {
  coverage: false,
  observations: true,
  ai: false,
  satellite: false,
  boundaries: true,
};
function matches(feature: IntelligenceFeature, search: string) {
  return [
    feature.properties.title,
    feature.properties.coverageCode,
    feature.properties.publicLabel,
    feature.properties.region,
  ]
    .join(" ")
    .toLowerCase()
    .includes(search.toLowerCase().trim());
}

export function MapExplorer({
  variant = "workspace",
}: {
  variant?: "workspace" | "preview";
}) {
  const [filters, setFilters] = useState(defaultFilters);
  const [layers, setLayers] = useState(defaultLayers);
  const [viewport, setViewport] = useState<MapViewport>();
  const onViewportChange = useCallback((next: MapViewport) => {
    setViewport((current) =>
      current?.zoom === next.zoom &&
      current.bbox.every((value, index) => value === next.bbox[index])
        ? current
        : next,
    );
  }, []);
  const requestedLayers = useMemo(
    () =>
      (Object.keys(layers) as MapLayerKey[]).filter(
        (layer) =>
          layers[layer] &&
          (layer !== "boundaries" ||
            (viewport?.zoom ?? 0) >= districtMinimumZoom),
      ),
    [layers, viewport?.zoom],
  );
  const data = useMapFeatures({
    bbox: viewport?.bbox,
    layers: requestedLayers,
    enabled: Boolean(viewport),
  });
  const [panel, setPanel] = useState<"filters" | "layers">();
  const [selectedId, setSelectedId] = useState<string>();
  const [selectedYear, setSelectedYear] = useState<number>();
  const [showLabels, setShowLabels] = useState(false);
  const [focusFeature, setFocusFeature] = useState<IntelligenceFeature>();
  const compact = variant === "preview";
  const select = useCallback(
    (feature: IntelligenceFeature) => setSelectedId(feature.id),
    [],
  );
  const closePanel = useCallback(() => setPanel(undefined), []);
  const closeDetails = useCallback(() => setSelectedId(undefined), []);
  const features = useMemo(
    () =>
      data.features.filter((feature) => {
        if (!layers[feature.properties.layer]) return false;
        if (
          selectedYear !== undefined &&
          feature.observedAt &&
          Number(feature.observedAt.slice(0, 4)) !== selectedYear
        )
          return false;
        if (filters.search.trim() && !matches(feature, filters.search))
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
      boundaries: 0,
    };
    for (const feature of data.features) result[feature.properties.layer]++;
    return result;
  }, [data.features]);
  const searchResults = useMemo(
    () =>
      filters.search.trim()
        ? data.features.filter((feature) => matches(feature, filters.search))
        : [],
    [data.features, filters.search],
  );
  const selected = data.features.find((feature) => feature.id === selectedId);
  const years = useMemo(
    () =>
      Array.from(
        new Set(
          data.features
            .filter(
              (feature) =>
                feature.properties.layer === "observations" &&
                feature.observedAt,
            )
            .map((feature) => Number(feature.observedAt!.slice(0, 4))),
        ),
      ).sort((a, b) => a - b),
    [data.features],
  );
  const timelineVisible = !compact && layers.observations && years.length > 0;

  return (
    <div
      className={
        compact
          ? "relative h-[60vh] min-h-[420px] max-h-[640px] overflow-hidden bg-[#172021]"
          : "relative h-[calc(100dvh-var(--app-header-height))] min-h-[420px] overflow-hidden bg-[#172021]"
      }
    >
      <HotspotMap
        showLabels={showLabels}
        timelineVisible={timelineVisible}
        features={features}
        selectedFeatureId={selectedId}
        onSelectFeature={select}
        compact={compact}
        focusFeature={focusFeature}
        onViewportChange={onViewportChange}
      />
      <div className="absolute left-3 right-3 top-3 z-[600] flex items-start gap-1.5 sm:right-auto sm:max-w-[calc(100%-15rem)]">
        {!compact && (
          <div className="relative min-w-0 flex-1 sm:w-44 sm:flex-none lg:w-64">
            <label htmlFor="map-feature-search" className="sr-only">
              Search public map features
            </label>
            <Icon
              name="search"
              className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted sm:top-3"
            />
            <Input
              id="map-feature-search"
              type="search"
              value={filters.search}
              placeholder="Find a district or record"
              autoComplete="off"
              aria-controls={
                filters.search.trim() ? "map-search-results" : undefined
              }
              onKeyDown={(event) => {
                if (event.key === "Escape")
                  setFilters((current) => ({ ...current, search: "" }));
              }}
              onChange={(event) =>
                setFilters((current) => ({
                  ...current,
                  search: event.target.value,
                }))
              }
              className="h-11 min-h-11 w-full bg-paper/95 pl-9 text-[13px] sm:h-10 sm:min-h-10"
            />
            {filters.search.trim() && (
              <div
                id="map-search-results"
                className="absolute left-0 top-12 w-[min(340px,calc(100vw-1.5rem))] overflow-hidden rounded-md border border-line bg-paper shadow-lift"
              >
                <p className="border-b border-line px-3 py-2 text-[11px] text-muted">
                  Searches loaded features in this view. Zoom in for districts.
                </p>
                {searchResults.length === 0 ? (
                  <p role="status" className="p-3 text-sm text-muted">
                    No matching public features.
                  </p>
                ) : (
                  <ul className="max-h-64 overflow-y-auto">
                    {searchResults.slice(0, 8).map((feature) => (
                      <li key={feature.id}>
                        <button
                          type="button"
                          className="block w-full border-b border-line px-3 py-2.5 text-left hover:bg-white focus-visible:bg-white"
                          onClick={() => {
                            document
                              .getElementById("map-feature-search")
                              ?.focus();
                            setLayers((current) => ({
                              ...current,
                              [feature.properties.layer]: true,
                            }));
                            setSelectedId(feature.id);
                            setFocusFeature({ ...feature });
                            setFilters(defaultFilters);
                            setSelectedYear(undefined);
                          }}
                        >
                          <span className="block text-sm font-medium text-ink">
                            {feature.properties.title}
                          </span>
                          <span className="mt-0.5 block text-[11px] text-muted">
                            {feature.type === "administrative_boundary"
                              ? "District reference"
                              : "Public map feature"}
                            {feature.properties.region
                              ? ` · ${feature.properties.region}`
                              : ""}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {searchResults.length > 8 && (
                  <p className="px-3 py-2 text-[11px] text-muted">
                    {searchResults.length} matches. Refine your search.
                  </p>
                )}
              </div>
            )}
          </div>
        )}
        <Button
          type="button"
          variant="secondary"
          size="sm"
          aria-label="Layers"
          title="Map layers"
          aria-expanded={panel === "layers"}
          aria-controls="map-layers"
          onClick={() => setPanel(panel === "layers" ? undefined : "layers")}
          className={`h-11 min-h-11 gap-2 bg-paper/95 px-3 sm:h-10 sm:min-h-10 ${panel === "layers" ? "border-forest-600 text-forest-800" : ""}`}
        >
          <Icon name="layers" className="h-4 w-4" />
          <span className={compact ? "" : "hidden sm:inline"}>Layers</span>
        </Button>
        {!compact && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            aria-label="Filters"
            title="Observation filters"
            aria-expanded={panel === "filters"}
            aria-controls="map-filters"
            onClick={() =>
              setPanel(panel === "filters" ? undefined : "filters")
            }
            className={`h-11 min-h-11 gap-2 bg-paper/95 px-3 sm:h-10 sm:min-h-10 ${panel === "filters" || filters.dateRange !== "All" ? "border-forest-600 text-forest-800" : ""}`}
          >
            <Icon name="filter" className="h-4 w-4" />
            <span className="hidden sm:inline">Filters</span>
          </Button>
        )}
      </div>
      <div className="pointer-events-none absolute left-3 top-16 z-[430] hidden text-white sm:block">
        <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-white/60">
          Ghana workspace
        </p>
        <p className="mt-1 hidden text-[10px] text-white/55 sm:block">
          Satellite reference · not a live feed
        </p>
      </div>
      {data.loading && (
        <p
          role="status"
          className="absolute left-3 top-28 z-[600] bg-paper/95 px-3 py-2 text-xs text-muted"
        >
          Loading public geography…
        </p>
      )}
      {data.error && (
        <div
          role="alert"
          className="absolute left-3 top-28 z-[600] max-w-64 border border-line bg-paper p-3 text-xs leading-5 text-ink"
        >
          Public monitoring data unavailable.{" "}
          <button
            type="button"
            onClick={data.retry}
            className="font-medium text-forest-800 underline"
          >
            Retry
          </button>
        </div>
      )}
      {data.truncated && (
        <p className="absolute left-3 top-28 z-[600] max-w-64 bg-paper/95 p-3 text-xs text-muted">
          Some features are omitted by the service limit.
        </p>
      )}
      {panel === "filters" && (
        <MapPanel
          title="Observation filters"
          id="map-filters"
          onClose={closePanel}
        >
          <MapFilters
            filters={filters}
            onChange={setFilters}
            onReset={() => {
              setFilters(defaultFilters);
              setSelectedYear(undefined);
            }}
          />
        </MapPanel>
      )}
      {panel === "layers" && (
        <MapPanel title="Map layers" id="map-layers" onClose={closePanel}>
          <MapLayerControl
            layers={layers}
            onChange={setLayers}
            counts={counts}
            showLabels={showLabels}
            onLabelsChange={setShowLabels}
            loading={data.loading}
            unavailable={Boolean(data.error)}
            zoom={viewport?.zoom ?? 0}
          />
        </MapPanel>
      )}
      {timelineVisible && (
        <div className="absolute bottom-7 left-3 right-16 z-[600] lg:right-[408px]">
          <TimelineControl
            years={years}
            selectedYear={selectedYear}
            onSelect={setSelectedYear}
          />
        </div>
      )}
      <IntelligenceDrawer feature={selected} onClose={closeDetails} />
    </div>
  );
}
