import { useEffect, useMemo, useState } from "react";
import { CircleMarker, MapContainer, Popup, TileLayer, Tooltip } from "react-leaflet";
import type { LatLngBoundsExpression, LatLngExpression } from "leaflet";
import type { Hotspot, Report } from "@/types";
import { AppLink } from "@/utils/navigation";
import { SeverityBadge } from "@/components/ui/SeverityBadge";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { severityPinColors, statusLabels } from "@/utils/badges";
import { cn } from "@/utils/cn";
import { formatDate } from "@/utils/format";

interface GhanaMapPlaceholderProps {
  hotspots: Hotspot[];
  reports: Report[];
}

const ghanaCenter: LatLngExpression = [7.9465, -1.0232];
const ghanaBounds: LatLngBoundsExpression = [
  [4.35, -3.45],
  [11.25, 1.4],
];

const severityLegend = [
  { label: "Low", color: severityPinColors.Low },
  { label: "Medium", color: severityPinColors.Medium },
  { label: "High", color: severityPinColors.High },
  { label: "Critical", color: severityPinColors.Critical },
];

export function GhanaMapPlaceholder({ hotspots, reports }: GhanaMapPlaceholderProps) {
  const [activeHotspotId, setActiveHotspotId] = useState("");
  const reportById = useMemo(() => new Map(reports.map((report) => [report.id, report])), [reports]);
  const activeHotspot = hotspots.find((hotspot) => hotspot.id === activeHotspotId) ?? hotspots[0];
  const activeReport = activeHotspot ? reportById.get(activeHotspot.reportId) : undefined;

  useEffect(() => {
    if (hotspots.length === 0) {
      setActiveHotspotId("");
      return;
    }

    const selectedStillVisible = hotspots.some((hotspot) => hotspot.id === activeHotspotId);
    if (!selectedStillVisible) {
      setActiveHotspotId(hotspots[0].id);
    }
  }, [activeHotspotId, hotspots]);

  return (
    <div className="relative min-h-[680px] overflow-hidden rounded-3xl border border-line bg-[#dbe7df] shadow-card">
      <MapContainer
        center={ghanaCenter}
        zoom={7}
        minZoom={6}
        maxZoom={13}
        maxBounds={ghanaBounds}
        maxBoundsViscosity={0.8}
        scrollWheelZoom
        className="z-0 h-[680px] w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {hotspots.map((hotspot) => {
          const report = reportById.get(hotspot.reportId);
          const selected = hotspot.id === activeHotspot?.id;
          const center: LatLngExpression = [
            hotspot.publicCoordinatesApproximate.lat,
            hotspot.publicCoordinatesApproximate.lng,
          ];

          return (
            <CircleMarker
              key={hotspot.id}
              center={center}
              radius={selected ? 13 : hotspot.severity === "Critical" ? 11 : 9}
              pathOptions={{
                color: "#ffffff",
                weight: selected ? 4 : 3,
                fillColor: severityPinColors[hotspot.severity],
                fillOpacity: 0.92,
                opacity: 1,
              }}
              eventHandlers={{
                click: () => setActiveHotspotId(hotspot.id),
              }}
            >
              <Tooltip direction="top" offset={[0, -6]} opacity={0.95}>
                <span className="text-xs font-semibold">{hotspot.label}</span>
              </Tooltip>
              {report ? (
                <Popup>
                  <div className="w-60">
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                      Approximate hotspot
                    </p>
                    <h3 className="mt-1 text-sm font-bold leading-snug text-slate-950">{report.title}</h3>
                    <p className="mt-2 text-xs leading-5 text-slate-600">{report.approximateLocationLabel}</p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      <SeverityBadge severity={report.severity} compact />
                      <StatusBadge status={report.status} compact />
                    </div>
                    <AppLink
                      href={`/reports/${report.id}`}
                      className="mt-3 inline-flex w-full items-center justify-center rounded-lg bg-forest-600 px-3 py-2 text-xs font-bold text-white hover:bg-forest-800"
                    >
                      View Details
                    </AppLink>
                  </div>
                </Popup>
              ) : null}
            </CircleMarker>
          );
        })}
      </MapContainer>

      <div className="pointer-events-none absolute left-4 right-4 top-4 z-[500] flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="pointer-events-auto rounded-xl bg-white/95 px-4 py-3 shadow-sm ring-1 ring-line">
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-muted">
            Ghana public hotspot map
          </p>
          <p className="mt-1 text-xs text-muted">{hotspots.length} generalized pins visible</p>
        </div>

        <div className="pointer-events-auto rounded-xl bg-white/95 p-3 shadow-sm ring-1 ring-line">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-faint">Severity legend</p>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            {severityLegend.map((item) => (
              <span key={item.label} className="inline-flex items-center gap-2 text-xs font-semibold text-muted">
                <span className="h-3 w-3 rounded-full ring-2 ring-white" style={{ backgroundColor: item.color }} />
                {item.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="pointer-events-none absolute bottom-4 left-4 z-[500] max-w-xs rounded-xl bg-white/95 px-4 py-3 text-xs leading-5 text-muted shadow-sm ring-1 ring-line">
        Pins use public approximate coordinates. Production should use an approved tile provider or self-hosted tiles.
      </div>

      {hotspots.length === 0 ? (
        <div className="absolute inset-0 z-[600] flex items-center justify-center bg-paper/50 p-4 backdrop-blur-sm">
          <div className="max-w-xs rounded-2xl border border-dashed border-line bg-white p-5 text-center shadow-card">
            <p className="font-bold text-ink">No pins match these filters</p>
            <p className="mt-2 text-sm leading-6 text-muted">
              Adjust region, status, severity, media type, or date range to restore public hotspot previews.
            </p>
          </div>
        </div>
      ) : null}

      {activeHotspot && activeReport ? (
        <div className="absolute bottom-20 left-4 right-4 z-[550] rounded-2xl border border-line bg-white p-4 shadow-lift lg:bottom-6 lg:left-auto lg:right-6 lg:top-28 lg:w-[340px]">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-faint">Selected hotspot</p>
              <h3 className="mt-1 text-lg font-bold leading-snug">{activeReport.title}</h3>
            </div>
            <span
              className={cn(
                "mt-1 h-3 w-3 shrink-0 rounded-full",
                activeReport.severity === "Critical" && "map-pin-critical",
              )}
              style={{ backgroundColor: severityPinColors[activeReport.severity] }}
            />
          </div>
          <p className="text-sm leading-6 text-muted">{activeReport.approximateLocationLabel}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <SeverityBadge severity={activeReport.severity} compact />
            <StatusBadge status={activeReport.status} compact />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-4 text-xs text-muted">
            <div>
              <span className="block font-bold text-ink">Region</span>
              {activeReport.region}
            </div>
            <div>
              <span className="block font-bold text-ink">Submitted</span>
              {formatDate(activeReport.dateSubmitted)}
            </div>
            <div>
              <span className="block font-bold text-ink">District</span>
              {activeReport.district}
            </div>
            <div>
              <span className="block font-bold text-ink">Media</span>
              {activeReport.mediaType}
            </div>
          </div>
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-950">
            Public status: {statusLabels[activeReport.status]}. Exact GPS and raw media remain private.
          </div>
          <AppLink
            href={`/reports/${activeReport.id}`}
            className="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-forest-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-forest-800"
          >
            View Details
          </AppLink>
        </div>
      ) : null}
    </div>
  );
}
