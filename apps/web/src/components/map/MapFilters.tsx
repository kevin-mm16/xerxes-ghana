import type { MediaType, ReportStatus, SeverityLevel } from "@/types";
import { ghanaRegions } from "@/data/mockReports";

export type DateRangeFilter = "All" | "Last 7 days" | "Last 30 days" | "Last 90 days";

export interface MapFilterState {
  region: string;
  search: string;
  severity: SeverityLevel | "All";
  status: ReportStatus | "All";
  dateRange: DateRangeFilter;
  verifiedOnly: boolean;
  mediaType: MediaType | "All";
}

interface MapFiltersProps {
  filters: MapFilterState;
  onChange: (next: MapFilterState) => void;
  onReset: () => void;
}

const severities: Array<SeverityLevel | "All"> = ["All", "Low", "Medium", "High", "Critical"];
const statuses: Array<ReportStatus | "All"> = ["All", "Pending", "Under Review", "Verified", "Rejected", "Escalated"];
const mediaTypes: Array<MediaType | "All"> = ["All", "Image", "Video", "Satellite", "Mixed"];
const dateRanges: DateRangeFilter[] = ["All", "Last 7 days", "Last 30 days", "Last 90 days"];

export function MapFilters({ filters, onChange, onReset }: MapFiltersProps) {
  const update = <K extends keyof MapFilterState>(key: K, value: MapFilterState[K]) => {
    onChange({ ...filters, [key]: value });
  };

  return (
    <aside className="rounded-2xl border border-line bg-white p-5 shadow-card lg:sticky lg:top-24">
      <div className="mb-5 flex items-center justify-between gap-4">
        <h2 className="text-lg font-bold">Filters</h2>
        <button type="button" onClick={onReset} className="text-sm font-semibold text-forest-800 hover:underline">
          Reset
        </button>
      </div>
      <p className="mb-5 text-sm leading-6 text-muted">
        Filters apply to public report summaries and generalized pins. Private coordinates and raw evidence stay out of
        this view.
      </p>

      <div className="space-y-5">
        <label className="block">
          <span className="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-faint">Region</span>
          <select
            value={filters.region}
            onChange={(event) => update("region", event.target.value)}
            className="h-11 w-full rounded-xl border border-line bg-white px-3 text-sm outline-none focus:border-forest-600"
          >
            <option value="All">All regions</option>
            {ghanaRegions.map((region) => (
              <option key={region.name} value={region.name}>
                {region.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-faint">
            District or town
          </span>
          <input
            value={filters.search}
            onChange={(event) => update("search", event.target.value)}
            placeholder="Search by district or place"
            className="h-11 w-full rounded-xl border border-line bg-white px-3 text-sm outline-none focus:border-forest-600"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          <label className="block">
            <span className="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-faint">Severity</span>
            <select
              value={filters.severity}
              onChange={(event) => update("severity", event.target.value as MapFilterState["severity"])}
              className="h-11 w-full rounded-xl border border-line bg-white px-3 text-sm outline-none focus:border-forest-600"
            >
              {severities.map((severity) => (
                <option key={severity} value={severity}>
                  {severity === "All" ? "All severities" : severity}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-faint">Status</span>
            <select
              value={filters.status}
              onChange={(event) => update("status", event.target.value as MapFilterState["status"])}
              className="h-11 w-full rounded-xl border border-line bg-white px-3 text-sm outline-none focus:border-forest-600"
            >
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {status === "All" ? "All statuses" : status}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          <label className="block">
            <span className="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-faint">Date range</span>
            <select
              value={filters.dateRange}
              onChange={(event) => update("dateRange", event.target.value as MapFilterState["dateRange"])}
              className="h-11 w-full rounded-xl border border-line bg-white px-3 text-sm outline-none focus:border-forest-600"
            >
              {dateRanges.map((range) => (
                <option key={range} value={range}>
                  {range}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-bold uppercase tracking-[0.14em] text-faint">Media type</span>
            <select
              value={filters.mediaType}
              onChange={(event) => update("mediaType", event.target.value as MapFilterState["mediaType"])}
              className="h-11 w-full rounded-xl border border-line bg-white px-3 text-sm outline-none focus:border-forest-600"
            >
              {mediaTypes.map((type) => (
                <option key={type} value={type}>
                  {type === "All" ? "All media types" : type}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-line bg-paper px-3 py-3 text-sm font-semibold text-ink">
          <input
            type="checkbox"
            checked={filters.verifiedOnly}
            onChange={(event) => update("verifiedOnly", event.target.checked)}
            className="h-4 w-4 accent-forest-600"
          />
          Verified only
        </label>
      </div>
    </aside>
  );
}
