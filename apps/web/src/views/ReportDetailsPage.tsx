import AppLink from "next/link";
import { notFound } from "next/navigation";
import type { PublicObservation } from "@/types/api";

export async function ReportDetailsPage({ reportId }: { reportId: string }) {
  if (!/^[0-9a-f-]{36}$/.test(reportId)) notFound();
  const base = process.env.API_INTERNAL_URL ?? "http://127.0.0.1:8000";
  let response: Response;
  try {
    response = await fetch(`${base}/api/v1/observations/${reportId}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
  } catch {
    return (
      <section className="mx-auto max-w-3xl p-8">
        <h1 className="text-2xl font-bold">Record temporarily unavailable</h1>
        <p className="mt-3">
          Please retry when the observation service is available.
        </p>
      </section>
    );
  }
  if (response.status === 404 || response.status === 422) notFound();
  if (!response.ok)
    return (
      <section className="mx-auto max-w-3xl p-8">
        <h1 className="text-2xl font-bold">Record temporarily unavailable</h1>
      </section>
    );
  const record: PublicObservation = await response.json();
  return (
    <section className="mx-auto max-w-3xl space-y-5 p-6 sm:p-8">
      <AppLink href="/map" className="text-sm font-bold text-forest-800">
        Back to satellite map
      </AppLink>
      <p className="text-xs font-bold uppercase text-forest-600">
        Human-reviewed public observation
      </p>
      <h1 className="font-serif text-4xl">{record.title}</h1>
      <p className="leading-7">{record.description}</p>
      <dl className="grid gap-4 rounded-2xl border border-line bg-white p-5 text-sm">
        <div>
          <dt className="font-bold">Generalized location</dt>
          <dd>{record.publicLabel}</dd>
        </div>
        <div>
          <dt className="font-bold">Public precision</dt>
          <dd>{record.precisionLevel}</dd>
        </div>
        <div>
          <dt className="font-bold">Observed</dt>
          <dd>{record.observedAt}</dd>
        </div>
      </dl>
      <p className="text-xs text-muted">
        Exact capture coordinates and original intake text are excluded from
        this public record.
      </p>
    </section>
  );
}
