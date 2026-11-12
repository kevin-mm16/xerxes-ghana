import type { CoverageResult } from "@/types/api";
import { Alert, Badge } from "@/components/ui";

export function CoverageStatus({ result }: { result: CoverageResult }) {
  const title =
    result.state === "uncertain"
      ? "Near a coverage boundary - review needed"
      : result.insideCoverage
        ? "Inside XERSXES coverage area"
        : "Outside current XERSXES monitoring coverage";
  return (
    <div role="status">
      <Alert tone={result.state === "inside" ? "green" : "amber"} title={title}>
        {[...result.matchedRegions, ...result.nearbyRegions].map((region) => (
          <div
            key={region.id}
            className="mt-2 flex flex-wrap items-center gap-2"
          >
            <span>{region.name}</span>
            {region.isDemo && <Badge tone="gold">Demo boundary</Badge>}
          </div>
        ))}
        {result.state === "uncertain" && (
          <p className="mt-2 text-muted">
            GPS accuracy overlaps a boundary. Your reported position alone
            cannot establish coverage confidently.
          </p>
        )}
        {result.state === "outside" && (
          <p className="mt-2 text-muted">
            You may still submit context for private review; monitoring
            availability is limited.
          </p>
        )}
      </Alert>
    </div>
  );
}
