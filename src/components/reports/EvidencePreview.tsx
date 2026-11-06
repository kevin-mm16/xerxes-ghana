import type { Report } from "@/types";

interface EvidencePreviewProps {
  report: Report;
  compact?: boolean;
}

export function EvidencePreview({ report, compact = false }: EvidencePreviewProps) {
  return (
    <div className={`satellite-texture relative overflow-hidden rounded-2xl border border-line ${compact ? "h-40" : "aspect-video"}`}>
      <div className="absolute left-3 top-3 rounded-lg bg-white/90 px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
        Sanitized {report.mediaType} preview
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="rounded-full bg-white/90 px-5 py-3 text-sm font-bold text-forest-800 shadow-lg">
          Public preview only
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/55 to-transparent p-4">
        <p className="font-mono text-xs text-white">Raw media is private and not exposed publicly.</p>
      </div>
    </div>
  );
}
