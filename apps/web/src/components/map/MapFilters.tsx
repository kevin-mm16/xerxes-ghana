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
    <aside className="max-h-[70vh] overflow-y-auto rounded-2xl border border-white/70 bg-white/97 p-4 shadow-lift backdrop-blur">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-faint">Explore</p>
          <h2 className="text-base font-bold">Filters</h2>
        </div>
        <button type="button" onClick={onReset} className="text-xs font-bold text-forest-800 hover:underline">
          Reset
        </button>
      </div>

      <div className="space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.12em] text-faint">Region</span>
          <select
            value={filters.region}
            onChange={(event) => update("region", event.target.value)}
            className="h-10 w-full rounded-xl border border-line bg-white px-3 text-sm outline-none focus:border-forest-600"
          >
            <option value="All">All regions</option>
            {ghanaRegions.map((region) => (
              <option key={region.name} value={region.name}>{region.name}</option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.12em] text-faint">Place</span>
          <input
            value={filters.search}
            onChange={(event) => update("search", event.target.value)}
            placeholder="District, town or report"
            className="h-10 w-full rounded-xl border border-line bg-white px-3 text-sm outline-none focus:border-forest-600"
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.12em] text-faint">Severity</span>
            <select
              value={filters.severity}
              onChange={(event) => update("severity", event.target.value as MapFilterState["severity"])}
              className="h-10 w-full rounded-xl border border-line bg-white px-2 text-sm outline-none focus:border-forest-600"
            >
              {severities.map((severity) => <option key={severity}>{severity}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.12em] text-faint">Status</span>
            <select
              value={filters.status}
              onChange={(event) => update("status", event.target.value as MapFilterState["status"])}
              className="h-10 w-full rounded-xl border border-line bg-white px-2 text-sm outline-none focus:border-forest-600"
            >
              {statuses.map((status) => <option key={status}>{status}</option>)}
            </select>
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.12em] text-faint">Date</span>
            <select
              value={filters.dateRange}
              onChange={(event) => update("dateRange", event.target.value as MapFilterState["dateRange"])}
              className="h-10 w-full rounded-xl border border-line bg-white px-2 text-sm outline-none focus:border-forest-600"
            >
              {dateRanges.map((range) => <option key={range}>{range}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.12em] text-faint">Media</span>
            <select
              value={filters.mediaType}
              onChange={(event) => update("mediaType", event.target.value as MapFilterState["mediaType"])}
              className="h-10 w-full rounded-xl border border-line bg-white px-2 text-sm outline-none focus:border-forest-600"
            >
              {mediaTypes.map((type) => <option key={type}>{type}</option>)}
            </select>
          </label>
        </div>

        <label className="flex cursor-pointer items-center gap-3 rounded-xl bg-paper px-3 py-2.5 text-sm font-semibold text-ink">
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
