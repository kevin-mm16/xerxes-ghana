"use client";

interface TimelineControlProps {
  years: number[];
  selectedYear: number;
  onSelect: (year: number) => void;
}

export function TimelineControl({ years, selectedYear, onSelect }: TimelineControlProps) {
  return (
    <div className="rounded-2xl border border-white/70 bg-white/95 px-4 py-3 shadow-lift backdrop-blur">
      <div className="flex items-center gap-3">
        <span className="hidden text-[11px] font-bold uppercase tracking-[0.14em] text-faint sm:inline">Time</span>
        <div className="flex flex-1 items-center gap-1 overflow-x-auto">
          {years.map((year) => (
            <button
              key={year}
              type="button"
              onClick={() => onSelect(year)}
              className={
                year === selectedYear
                  ? "rounded-lg bg-forest-800 px-3 py-1.5 text-xs font-bold text-white"
                  : "rounded-lg px-3 py-1.5 text-xs font-semibold text-muted hover:bg-paper"
              }
            >
              {year}
            </button>
          ))}
        </div>
        <span className="hidden text-xs text-muted md:inline">Historical layers are demo data until the satellite pipeline is connected.</span>
      </div>
    </div>
  );
}
