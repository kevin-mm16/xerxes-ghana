"use client";

import { SectionLabel } from "@/components/ui";
import type { MapLayerKey, MapLayerState } from "@/types/intelligence";

interface Props {
  layers: MapLayerState;
  onChange: (next: MapLayerState) => void;
  counts: Record<MapLayerKey, number>;
  showLabels: boolean;
  onLabelsChange: (value: boolean) => void;
  loading?: boolean;
  unavailable?: boolean;
  zoom?: number;
}
const groups: Array<{
  title: string;
  items: Array<{ key: MapLayerKey; label: string; help: string }>;
}> = [
  {
    title: "Reference",
    items: [
      {
        key: "boundaries",
        label: "GSS district boundaries",
        help: "2021 census · visible from zoom 9",
      },
    ],
  },
  {
    title: "Monitoring",
    items: [
      {
        key: "coverage",
        label: "Monitoring areas",
        help: "XERSXES coverage · demonstration geometry",
      },
      {
        key: "observations",
        label: "Reviewed observations",
        help: "Public records only",
      },
    ],
  },
  {
    title: "Analysis",
    items: [
      {
        key: "satellite",
        label: "Satellite change",
        help: "Published environmental analysis",
      },
      {
        key: "ai",
        label: "AI candidates",
        help: "Model signals requiring review",
      },
    ],
  },
];

export function MapLayerControl({
  layers,
  onChange,
  counts,
  showLabels,
  onLabelsChange,
  loading = false,
  unavailable = false,
  zoom = 9,
}: Props) {
  function layerHelp(key: MapLayerKey, help: string) {
    if (key === "ai" && counts[key] === 0) return "No model results available";
    if (key === "satellite" && counts[key] === 0)
      return "No analysis results available";
    if (key === "boundaries" && zoom < 9)
      return "Zoom to level 9 to load visible districts";
    if (!layers[key] && key !== "ai" && key !== "satellite")
      return "Enable to load records in this view";
    if (counts[key] > 0) return help;
    if (loading) return "Loading public geography…";
    if (unavailable) return "Public data unavailable";
    return "No public records in this view";
  }
  return (
    <div className="space-y-5">
      <div>
        <SectionLabel>Map</SectionLabel>
        <p className="mb-3 mt-2 text-xs leading-5 text-muted">
          Satellite imagery is the base view. Acquisition dates vary.
        </p>
        <label className="flex cursor-pointer items-start gap-3 text-sm text-ink">
          <input
            type="checkbox"
            checked={showLabels}
            onChange={() => onLabelsChange(!showLabels)}
            className="mt-0.5 h-4 w-4 accent-forest-600"
          />
          <span>
            <span className="block font-medium">Town and road labels</span>
            <span className="mt-1 block text-xs leading-5 text-muted">
              Provider labels may include reference lines. Names do not define
              town boundaries.
            </span>
          </span>
        </label>
      </div>
      {groups.map((group) => (
        <fieldset key={group.title} className="border-t border-line pt-4">
          <legend className="sr-only">{group.title}</legend>
          <SectionLabel>{group.title}</SectionLabel>
          <div className="mt-3 space-y-4">
            {group.items.map(({ key, label, help }) => (
              <label
                key={key}
                className={`flex items-start gap-3 text-sm ${(key === "ai" || key === "satellite") && counts[key] === 0 ? "cursor-not-allowed text-muted" : "cursor-pointer text-ink"}`}
              >
                <input
                  type="checkbox"
                  checked={layers[key]}
                  disabled={
                    (key === "ai" || key === "satellite") && counts[key] === 0
                  }
                  onChange={() => onChange({ ...layers, [key]: !layers[key] })}
                  className="mt-0.5 h-4 w-4 accent-forest-600"
                />
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{label}</span>
                  <span className="mt-1 block text-xs leading-5 text-muted">
                    {layerHelp(key, help)}
                  </span>
                </span>
                {counts[key] > 0 && (
                  <span className="font-mono text-[11px] tabular-nums text-muted">
                    {counts[key]}
                  </span>
                )}
              </label>
            ))}
          </div>
        </fieldset>
      ))}
      <p className="border-t border-line pt-3 text-[11px] leading-5 text-muted">
        Reference geography is separate from monitoring eligibility and evidence
        of environmental activity.
      </p>
    </div>
  );
}
