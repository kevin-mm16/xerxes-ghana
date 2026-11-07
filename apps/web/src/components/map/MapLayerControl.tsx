"use client";

import type { MapLayerKey, MapLayerState } from "@/types/intelligence";
interface Props {
  layers: MapLayerState;
  onChange: (next: MapLayerState) => void;
  counts: Record<MapLayerKey, number>;
  showLabels: boolean;
  onLabelsChange: (value: boolean) => void;
}
const labels: Array<{ key: MapLayerKey; label: string }> = [
  { key: "boundaries", label: "GSS district boundaries" },
  { key: "coverage", label: "Monitoring areas" },
  { key: "observations", label: "Reviewed observations" },
  { key: "ai", label: "AI candidates" },
  { key: "satellite", label: "Analysis results" },
];
export function MapLayerControl({
  layers,
  onChange,
  counts,
  showLabels,
  onLabelsChange,
}: Props) {
  return (
    <div
      id="map-layers"
      className="max-h-[42dvh] w-60 overflow-y-auto rounded-2xl border border-line bg-white/95 p-3 shadow-lift backdrop-blur"
    >
      <h2 className="px-2 text-xs font-bold uppercase tracking-wide text-muted">
        Map layers
      </h2>
      <p className="px-2 pt-2 text-xs text-muted">
        Satellite imagery is always the base view. Place names do not define
        town boundaries.
      </p>
      <label className="mt-1 flex items-center gap-3 rounded-xl border-b border-line p-2 text-sm">
        <input
          type="checkbox"
          checked={showLabels}
          onChange={() => onLabelsChange(!showLabels)}
          className="h-4 w-4"
        />
        <span>Town and road labels</span>
      </label>
      <p className="px-2 text-[11px] text-muted">
        Provider labels can include reference lines. Gold district outlines use
        GSS data.
      </p>
      {labels.map(({ key, label }) => (
        <label
          key={key}
          className="mt-1 flex items-center gap-3 rounded-xl p-2 text-sm"
        >
          <input
            type="checkbox"
            checked={layers[key]}
            disabled={counts[key] === 0}
            onChange={() => onChange({ ...layers, [key]: !layers[key] })}
            className="h-4 w-4"
          />
          <span className="flex-1">{label}</span>
          <span className="text-xs text-muted">{counts[key]}</span>
        </label>
      ))}
      {counts.boundaries > 0 && (
        <p className="px-2 pt-2 text-xs text-muted">
          District outlines: GSS 2021 census geography. Select an outline for
          its source.
        </p>
      )}
    </div>
  );
}
