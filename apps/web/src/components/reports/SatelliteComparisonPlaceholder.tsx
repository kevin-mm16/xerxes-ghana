"use client";

import { useState } from "react";

export function SatelliteComparisonPlaceholder() {
  const [year, setYear] = useState(2026);

  return (
    <section className="rounded-2xl border border-line bg-white p-5 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Time-series comparison</h2>
          <p className="mt-1 text-sm text-muted">
            This panel stays blank until historical satellite imagery is connected.
          </p>
        </div>
        <span className="rounded-full bg-forest-50 px-3 py-1 text-xs font-bold text-forest-800">
          Google Earth Engine later
        </span>
      </div>

      <div className="relative mt-5 aspect-[16/8] overflow-hidden rounded-2xl border border-dashed border-line bg-paper">
        <div className="absolute inset-0 surface-grid opacity-60" />
        <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-faint">
              Satellite imagery not loaded
            </p>
            <p className="mt-3 max-w-md text-sm leading-6 text-muted">
              The timeline control is reserved for comparing this location across historical imagery once the satellite
              pipeline is available.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-5">
        <input
          type="range"
          min="2021"
          max="2026"
          value={year}
          onChange={(event) => setYear(Number(event.target.value))}
          className="w-full accent-forest-600"
        />
        <div className="mt-2 flex justify-between font-mono text-xs text-faint">
          <span>2021</span>
          <span>2022</span>
          <span>2023</span>
          <span>2024</span>
          <span>2025</span>
          <span>2026</span>
        </div>
        <p className="mt-3 text-center text-sm font-bold text-forest-800">Viewing year: {year}</p>
      </div>
    </section>
  );
}
