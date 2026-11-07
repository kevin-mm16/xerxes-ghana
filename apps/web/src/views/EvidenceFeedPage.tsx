"use client";

import AppLink from "next/link";
import { useMapFeatures } from "@/hooks/useMapFeatures";

export function EvidenceFeedPage() {
  const data = useMapFeatures();
  const observations = data.features.filter(
    (feature) => feature.properties.layer === "observations",
  );
  return (
    <section className="mx-auto max-w-5xl space-y-5 px-4 py-8">
      <h1 className="font-serif text-3xl">Reviewed observations</h1>
      {data.loading && <p role="status">Loading observations...</p>}
      {data.error && (
        <p role="alert">
          Observations unavailable.{" "}
          <button onClick={data.retry} className="underline">
            Retry
          </button>
        </p>
      )}
      {!data.loading && !data.error && observations.length === 0 && (
        <p className="text-muted">
          No sanitized observations have been published yet.
        </p>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        {observations.map((feature) => (
          <article
            key={feature.id}
            className="rounded-2xl border border-line bg-white p-5"
          >
            <h2 className="text-lg font-bold">{feature.properties.title}</h2>
            <p className="mt-2 text-sm text-muted">
              {feature.properties.publicLabel}
            </p>
            <p className="mt-2 text-sm">{feature.properties.summary}</p>
            <AppLink
              href={`/reports/${feature.properties.observationId}`}
              className="mt-4 inline-block font-bold text-forest-800"
            >
              Open reviewed record
            </AppLink>
          </article>
        ))}
      </div>
    </section>
  );
}
