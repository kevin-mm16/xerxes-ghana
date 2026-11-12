"use client";

import { Button, Select } from "@/components/ui";

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
    <div>
      <label
        className="block text-sm font-medium text-ink"
        htmlFor="map-observation-period"
      >
        Observation period
      </label>
      <Select
        id="map-observation-period"
        value={filters.dateRange}
        onChange={(event) =>
          onChange({
            ...filters,
            dateRange: event.target.value as MapFilterState["dateRange"],
          })
        }
        className="mt-2 w-full"
      >
        {["All", "Last 7 days", "Last 30 days", "Last 90 days"].map((value) => (
          <option key={value}>{value}</option>
        ))}
      </Select>
      <p className="mt-3 text-xs leading-5 text-muted">
        Filters apply to dated public observations. They do not change the date
        of the satellite base.
      </p>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onReset}
        className="mt-5"
      >
        Reset filters
      </Button>
    </div>
  );
}
