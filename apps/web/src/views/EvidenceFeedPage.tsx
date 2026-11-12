"use client";

import { useMapFeatures } from "@/hooks/useMapFeatures";
import { ObservationRecord } from "@/components/evidence/ObservationRecord";
import {
  Alert,
  Button,
  EmptyState,
  Icon,
  LinkButton,
  SectionLabel,
  Skeleton,
} from "@/components/ui";

export function EvidenceFeedPage() {
  const data = useMapFeatures("observations");
  const observations = data.features.filter(
    (feature) =>
      feature.properties.layer === "observations" &&
      feature.properties.status === "Verified",
  );
  return (
    <section className="page-shell">
      <header className="mb-10 flex flex-wrap items-end justify-between gap-6">
        <div>
          <SectionLabel>Evidence / Ghana</SectionLabel>
          <h1 className="page-heading mt-4">Reviewed observations</h1>
          <p className="page-intro mt-4">
            A public record of environmental observations, reviewed before
            publication and shown with generalized locations.
          </p>
        </div>
        <LinkButton href="/map" variant="secondary" size="sm">
          <Icon name="map" className="h-4 w-4" />
          Explore the map
        </LinkButton>
      </header>

      {data.loading ? (
        <div
          role="status"
          aria-label="Loading reviewed observations"
          className="record-list"
        >
          {[0, 1, 2].map((item) => (
            <div key={item} className="space-y-4 border-b border-line py-8">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          ))}
          <span className="sr-only">Loading reviewed observations...</span>
        </div>
      ) : data.error ? (
        <Alert
          tone="amber"
          role="alert"
          title="Public records are temporarily unavailable"
        >
          <p>We could not load the observation service. Please try again.</p>
          <Button
            variant="secondary"
            size="sm"
            className="mt-4"
            onClick={data.retry}
          >
            Retry
          </Button>
        </Alert>
      ) : observations.length === 0 ? (
        <div className="border-y border-line">
          <EmptyState
            title="No public records yet"
            description="Reviewed summaries will appear here after publication. Private submissions and media are not displayed in this feed."
          >
            <LinkButton href="/report" variant="secondary">
              Contribute an observation
              <Icon name="arrow-right" className="h-4 w-4" />
            </LinkButton>
          </EmptyState>
        </div>
      ) : (
        <>
          {data.truncated ? (
            <Alert tone="neutral" className="mb-6">
              Only the first available records are shown in this view.
            </Alert>
          ) : null}
          <div className="record-list">
            {observations.map((feature) => (
              <ObservationRecord key={feature.id} feature={feature} />
            ))}
          </div>
          <p className="mt-6 text-xs leading-6 text-muted">
            Public summaries are separate from private evidence intake. Capture
            coordinates, original submissions and private media are not shown.
          </p>
        </>
      )}
    </section>
  );
}
