"use client";

import { useMemo, useState } from "react";
import type { MediaType, Report, ReportStatus, SeverityLevel } from "@/types";
import { FilterChip } from "@/components/ui/FilterChip";
import { HotspotMap } from "@/components/map/BrowserMaps";
import { HotspotCard } from "@/components/map/HotspotCard";
import { MapFilters, type MapFilterState } from "@/components/map/MapFilters";
import { SafetyNotice } from "@/components/ui/SafetyNotice";
import { mockHotspots } from "@/data/mockHotspots";
import { mockReports } from "@/data/mockReports";

const defaultFilters: MapFilterState = {
  region: "All",
  search: "",
  severity: "All",
  status: "All",
  dateRange: "Last 30 days",
  verifiedOnly: false,
  mediaType: "All",
};

const referenceDate = new Date("2026-07-09T00:00:00Z");

function withinDateRange(report: Report, range: MapFilterState["dateRange"]) {
  if (range === "All") return true;

  const days = range === "Last 7 days" ? 7 : range === "Last 30 days" ? 30 : 90;
  const submitted = new Date(`${report.dateSubmitted}T00:00:00Z`);
  const diff = referenceDate.getTime() - submitted.getTime();
  return diff <= days * 24 * 60 * 60 * 1000;
}

function matchesFilter<T extends string>(value: T, filter: T | "All") {
  return filter === "All" || value === filter;
}

export function MapExplorer() {
  const [filters, setFilters] = useState<MapFilterState>(defaultFilters);

  const filteredReports = useMemo(() => {
    const search = filters.search.trim().toLowerCase();

    return mockReports.filter((report) => {
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
    });
  }, [filters]);

  const filteredReportIds = new Set(filteredReports.map((report) => report.id));
  const filteredHotspots = mockHotspots.filter((hotspot) => filteredReportIds.has(hotspot.reportId));
  const summary = [
    { label: "Visible pins", value: String(filteredHotspots.length) },
    { label: "Critical", value: String(filteredReports.filter((report) => report.severity === "Critical").length) },
    { label: "Verified", value: String(filteredReports.filter((report) => report.status === "Verified").length) },
    { label: "Escalated", value: String(filteredReports.filter((report) => report.status === "Escalated").length) },
  ];

  const clearFilter = (key: keyof MapFilterState) => {
    setFilters((current) => ({ ...current, [key]: defaultFilters[key] }));
  };

  const activeFilters = [
    filters.region !== "All" ? { key: "region" as const, label: "Region", value: filters.region } : null,
    filters.search ? { key: "search" as const, label: "Search", value: filters.search } : null,
    filters.severity !== "All" ? { key: "severity" as const, label: "Severity", value: filters.severity } : null,
    filters.status !== "All" ? { key: "status" as const, label: "Status", value: filters.status } : null,
    filters.dateRange !== "All" ? { key: "dateRange" as const, label: "Date", value: filters.dateRange } : null,
    filters.mediaType !== "All" ? { key: "mediaType" as const, label: "Media", value: filters.mediaType } : null,
    filters.verifiedOnly ? { key: "verifiedOnly" as const, label: "Verified only", value: "" } : null,
  ].filter(Boolean) as Array<{ key: keyof MapFilterState; label: string; value: string }>;

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <MapFilters filters={filters} onChange={setFilters} onReset={() => setFilters(defaultFilters)} />

      <div className="space-y-6">
        <SafetyNotice title="Public location privacy" tone="privacy">
          Public map pins are generalized. Exact coordinates and raw evidence are private moderator-only data in this
          frontend stage.
        </SafetyNotice>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {activeFilters.length > 0 ? (
              activeFilters.map((filter) => (
                <FilterChip
                  key={filter.key}
                  label={filter.label}
                  value={filter.value}
                  onRemove={() => clearFilter(filter.key)}
                />
              ))
            ) : (
              <span className="text-sm text-muted">No active filters</span>
            )}
          </div>
          <p className="text-sm text-muted">
            Showing <strong className="text-ink">{filteredReports.length}</strong> report previews
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {summary.map((item) => (
            <div key={item.label} className="rounded-2xl border border-line bg-white px-4 py-3 shadow-card">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-faint">{item.label}</p>
              <p className="mt-2 font-serif text-3xl font-semibold leading-none text-forest-800">{item.value}</p>
            </div>
          ))}
        </div>

        <HotspotMap hotspots={filteredHotspots} reports={filteredReports} />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredReports.length > 0 ? (
            filteredReports.map((report) => <HotspotCard key={report.id} report={report} />)
          ) : (
            <div className="rounded-2xl border border-dashed border-line bg-white p-8 text-center text-muted md:col-span-2 xl:col-span-3">
              No public report previews match these filters.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
