"use client";

import { useEffect, useMemo, useState } from "react";
import type { MediaType, Report, ReportStatus, SeverityLevel } from "@/types";
import type {
  BaseMapKey,
  IntelligenceFeature,
  MapLayerKey,
  MapLayerState,
} from "@/types/intelligence";
import { HotspotMap } from "@/components/map/BrowserMaps";
import { IntelligenceDrawer } from "@/components/map/IntelligenceDrawer";
import { MapFilters, type MapFilterState } from "@/components/map/MapFilters";
import { MapLayerControl } from "@/components/map/MapLayerControl";
import { TimelineControl } from "@/components/map/TimelineControl";
import { getMapFeatures, getMapReports } from "@/services/map-data";

interface MapExplorerProps {
  variant?: "workspace" | "preview";
}

const defaultFilters: MapFilterState = {
  region: "All",
  search: "",
  severity: "All",
  status: "All",
  dateRange: "All",
  verifiedOnly: false,
  mediaType: "All",
};

const defaultLayers: MapLayerState = {
  coverage: true,
  observations: true,
  ai: false,
  satellite: false,
};

const referenceDate = new Date("2026-07-09T00:00:00Z");

function withinDateRange(report: Report, range: MapFilterState["dateRange"]) {
  if (range === "All") return true;
  const days = range === "Last 7 days" ? 7 : range === "Last 30 days" ? 30 : 90;
  const submitted = new Date(`${report.dateSubmitted}T00:00:00Z`);
  const diff = referenceDate.getTime() - submitted.getTime();
  return diff >= 0 && diff <= days * 24 * 60 * 60 * 1000;
}

function matchesFilter<T extends string>(value: T, filter: T | "All") {
  return filter === "All" || value === filter;
}

function featureYear(feature: IntelligenceFeature) {
  return feature.observedAt ? Number(feature.observedAt.slice(0, 4)) : null;
}

export function MapExplorer({ variant = "workspace" }: MapExplorerProps) {
  const reports = useMemo(() => getMapReports(), []);
  const allFeatures = useMemo(() => getMapFeatures(), []);
  const [filters, setFilters] = useState<MapFilterState>(defaultFilters);
  const [layers, setLayers] = useState<MapLayerState>(defaultLayers);
  const [baseMap, setBaseMap] = useState<BaseMapKey>("satellite");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedFeatureId, setSelectedFeatureId] = useState<string>();
  const [selectedYear, setSelectedYear] = useState(2026);

  const filteredReportIds = useMemo(() => {
    const search = filters.search.trim().toLowerCase();
    return new Set(
      reports
        .filter((report) => {
          const matchesSearch =
            !search ||
            report.district.toLowerCase().includes(search) ||
            report.approximateLocationLabel.toLowerCase().includes(search) ||
            report.title.toLowerCase().includes(search);

          return (
            matchesFilter(report.region, filters.region) &&
            matchesFilter<SeverityLevel>(report.severity, filters.severity) &&
            matchesFilter<ReportStatus>(report.status, filters.status) &&
            matchesFilter<MediaType>(report.mediaType, filters.mediaType) &&
            matchesSearch &&
            withinDateRange(report, filters.dateRange) &&
            (!filters.verifiedOnly || report.status === "Verified")
          );
        })
        .map((report) => report.id),
    );
  }, [filters, reports]);

  const visibleFeatures = useMemo(() => {
    const search = filters.search.trim().toLowerCase();

    return allFeatures.filter((feature) => {
      if (!layers[feature.properties.layer]) return false;

      if (feature.type !== "coverage_region" && featureYear(feature) !== selectedYear) return false;

      if (filters.region !== "All" && feature.properties.region && feature.properties.region !== filters.region) {
        return false;
      }

      if (feature.properties.reportId && !filteredReportIds.has(feature.properties.reportId)) return false;

      if (!feature.properties.reportId && search) {
        const haystack = [
          feature.properties.title,
          feature.properties.region,
          feature.properties.district,
          feature.properties.summary,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(search)) return false;
      }

      return true;
    });
  }, [allFeatures, filteredReportIds, filters.region, filters.search, layers, selectedYear]);

  const selectedFeature = allFeatures.find((feature) => feature.id === selectedFeatureId);

  useEffect(() => {
    if (selectedFeature && !visibleFeatures.some((feature) => feature.id === selectedFeature.id)) {
      setSelectedFeatureId(undefined);
    }
  }, [selectedFeature, visibleFeatures]);

  const layerCounts = useMemo(() => {
    const counts: Record<MapLayerKey, number> = { coverage: 0, observations: 0, ai: 0, satellite: 0 };
    allFeatures.forEach((feature) => {
      counts[feature.properties.layer] += 1;
    });
    return counts;
  }, [allFeatures]);

  const years = useMemo(() => {
    const discovered = allFeatures
      .map(featureYear)
      .filter((year): year is number => year !== null);
    return Array.from(new Set(discovered)).sort((a, b) => a - b);
  }, [allFeatures]);

  const observationCount = visibleFeatures.filter((feature) => feature.properties.layer === "observations").length;
  const aiCount = visibleFeatures.filter((feature) => feature.properties.layer === "ai").length;
  const compact = variant === "preview";

  return (
    <div
      className={
        compact
          ? "relative overflow-hidden rounded-3xl border border-line bg-[#17251d] shadow-card"
          : "relative h-[calc(100vh-112px)] min-h-[700px] overflow-hidden bg-[#17251d]"
      }
    >
      <HotspotMap
        baseMap={baseMap}
        features={visibleFeatures}
        selectedFeatureId={selectedFeatureId}
        onSelectFeature={(feature) => setSelectedFeatureId(feature.id)}
        compact={compact}
      />

      <div className="pointer-events-none absolute left-4 top-4 z-[600] flex items-start gap-2">
        {!compact ? (
          <button
            type="button"
            onClick={() => setFiltersOpen((current) => !current)}
            className="pointer-events-auto rounded-xl border border-white/70 bg-white/95 px-4 py-2.5 text-sm font-bold text-forest-800 shadow-lift backdrop-blur"
          >
            {filtersOpen ? "Close filters" : "Filters"}
          </button>
        ) : null}

        <div className="rounded-xl border border-white/70 bg-white/95 px-3 py-2 shadow-lift backdrop-blur">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-faint">Visible</p>
          <p className="text-sm font-bold text-ink">{observationCount} observations · {aiCount} AI</p>
        </div>
      </div>

      {!compact && filtersOpen ? (
        <div className="absolute left-4 top-16 z-[640] w-[min(320px,calc(100%-2rem))]">
          <MapFilters
            filters={filters}
            onChange={setFilters}
            onReset={() => setFilters(defaultFilters)}
          />
        </div>
      ) : null}

      <div className="absolute right-4 top-4 z-[600] hidden sm:block">
        <MapLayerControl
          baseMap={baseMap}
          onBaseMapChange={setBaseMap}
          layers={layers}
          onChange={setLayers}
          counts={layerCounts}
        />
      </div>

      {!compact ? (
        <div className="absolute bottom-4 left-4 right-4 z-[600] lg:right-[408px]">
          <TimelineControl years={years} selectedYear={selectedYear} onSelect={setSelectedYear} />
        </div>
      ) : null}

      <IntelligenceDrawer
        feature={selectedFeature}
        onClose={() => setSelectedFeatureId(undefined)}
      />
    </div>
  );
}
