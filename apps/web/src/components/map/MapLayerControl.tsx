"use client";

import type { BaseMapKey, MapLayerKey, MapLayerState } from "@/types/intelligence";

interface MapLayerControlProps {
  baseMap: BaseMapKey;
  onBaseMapChange: (next: BaseMapKey) => void;
  layers: MapLayerState;
  onChange: (next: MapLayerState) => void;
  counts: Record<MapLayerKey, number>;
}

const baseMaps: Array<{ key: BaseMapKey; label: string; detail: string }> = [
  { key: "satellite", label: "Satellite", detail: "Sentinel-2 composite" },
  { key: "vegetation", label: "Vegetation", detail: "NDVI condition" },
  { key: "streets", label: "Streets", detail: "OpenStreetMap" },
];

const layerLabels: Array<{ key: MapLayerKey; label: string; dot: string }> = [
  { key: "coverage", label: "Coverage areas", dot: "bg-emerald-600" },
  { key: "observations", label: "Public observations", dot: "bg-red-600" },
  { key: "ai", label: "AI candidates", dot: "bg-violet-600" },
  { key: "satellite", label: "Change signals", dot: "bg-amber-500" },
];

export function MapLayerControl({
  baseMap,
  onBaseMapChange,
  layers,
  onChange,
  counts,
}: MapLayerControlProps) {
  const toggle = (key: MapLayerKey) => onChange({ ...layers, [key]: !layers[key] });

  return (
    <div className="w-64 rounded-2xl border border-white/70 bg-white/95 p-3 shadow-lift backdrop-blur">
      <p className="px-1 text-[11px] font-bold uppercase tracking-[0.16em] text-faint">Earth view</p>
      <div className="mt-2 grid gap-1">
        {baseMaps.map((item) => (
          <label key={item.key} className="flex cursor-pointer items-center gap-3 rounded-xl px-2 py-2 hover:bg-paper">
            <input
              type="radio"
              name="base-map"
              value={item.key}
              checked={baseMap === item.key}
              onChange={() => onBaseMapChange(item.key)}
              className="h-4 w-4 accent-forest-600"
            />
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-ink">{item.label}</span>
              <span className="block text-[10px] text-faint">{item.detail}</span>
            </span>
          </label>
        ))}
      </div>

      <div className="my-3 border-t border-line" />

      <p className="px-1 text-[11px] font-bold uppercase tracking-[0.16em] text-faint">Intelligence layers</p>
      <div className="mt-2 space-y-1">
        {layerLabels.map((item) => (
          <label key={item.key} className="flex cursor-pointer items-center gap-3 rounded-xl px-2 py-2 text-sm hover:bg-paper">
            <input
              type="checkbox"
              checked={layers[item.key]}
              onChange={() => toggle(item.key)}
              className="h-4 w-4 accent-forest-600"
            />
            <span className={`h-2.5 w-2.5 rounded-full ${item.dot}`} />
            <span className="flex-1 font-semibold text-ink">{item.label}</span>
            <span className="font-mono text-[11px] text-faint">{counts[item.key]}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
