"use client";

export interface MapFilterState {
  search: string;
  dateRange: "All" | "Last 7 days" | "Last 30 days" | "Last 90 days";
}
interface Props {
  filters: MapFilterState;
  onChange: (value: MapFilterState) => void;
  onReset: () => void;
}
export function MapFilters({ filters, onChange, onReset }: Props) {
  return (
    <aside className="rounded-2xl border border-line bg-white p-4 shadow-lift">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-bold">Filters</h2>
        <button
          type="button"
          onClick={onReset}
          className="text-sm text-forest-800"
        >
          Reset
        </button>
      </div>
      <label className="block text-sm">
        Search areas or observations
        <input
          value={filters.search}
          onChange={(event) =>
            onChange({ ...filters, search: event.target.value })
          }
          className="mt-2 h-11 w-full rounded-xl border border-line px-3"
        />
      </label>
      <label className="mt-3 block text-sm">
        Observation period
        <select
          value={filters.dateRange}
          onChange={(event) =>
            onChange({
              ...filters,
              dateRange: event.target.value as MapFilterState["dateRange"],
            })
          }
          className="mt-2 h-11 w-full rounded-xl border border-line px-3"
        >
          {["All", "Last 7 days", "Last 30 days", "Last 90 days"].map(
            (value) => (
              <option key={value}>{value}</option>
            ),
          )}
        </select>
      </label>
    </aside>
  );
}
