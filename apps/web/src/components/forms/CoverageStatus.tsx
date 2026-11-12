import type { CoverageResult } from "@/types/api";

export function CoverageStatus({ result }: { result: CoverageResult }) {
  const title =
    result.state === "uncertain"
      ? "Near a coverage boundary - review needed"
      : result.insideCoverage
        ? "Inside XERSXES coverage area"
        : "Outside current XERSXES monitoring coverage";
  return (
    <div
      role="status"
      className="rounded-xl border border-line bg-forest-50 p-4 text-sm"
    >
      <p className="font-bold">{title}</p>
      {[...result.matchedRegions, ...result.nearbyRegions].map((region) => (
        <p key={region.id} className="mt-1">
          {region.name} | {region.code}
          {region.isDemo ? " (demo boundary)" : ""}
        </p>
      ))}
      {result.state === "uncertain" && (
        <p className="mt-2 text-muted">
          GPS accuracy overlaps a boundary. Your reported position alone cannot
          establish coverage confidently.
        </p>
      )}
      {result.state === "outside" && (
        <p className="mt-2 text-muted">
          You may still submit context for private review; monitoring
          availability is limited.
        </p>
      )}
    </div>
  );
}
