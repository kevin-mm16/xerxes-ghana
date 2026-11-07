"use client";

import { useState, type FormEvent } from "react";
import { useLocationCoverage } from "@/hooks/useLocationCoverage";
import { submitObservation } from "@/services/api";
import type { SubmissionReceipt } from "@/types/api";
import { LocationPicker } from "./LocationPicker";

export function ReportSubmissionForm() {
  const location = useLocationCoverage();
  const [manualLocation, setManualLocation] = useState("");
  const [description, setDescription] = useState("");
  const [title, setTitle] = useState("");
  const [observedDate, setObservedDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState<SubmissionReceipt>();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!location.state.capture && !manualLocation.trim()) {
      setError("Choose a location or describe an approximate area.");
      return;
    }
    if (location.state.capture && location.state.status !== "complete") {
      setError("Complete the coverage check before submitting.");
      return;
    }
    if (!description.trim()) {
      setError("Describe what you observed.");
      return;
    }
    if (!observedDate) {
      setError("Choose the observation date.");
      return;
    }
    if (!consent) {
      setError("Agree to private storage and review before submitting.");
      return;
    }
    setBusy(true);
    try {
      const result = await submitObservation({
        title: title.trim() || undefined,
        description: description.trim(),
        observedAt: new Date(`${observedDate}T00:00:00Z`).toISOString(),
        captureLocation: location.state.capture,
        manualLocation: manualLocation.trim() || undefined,
        anonymous: true,
        consent: true,
        mediaType: "none",
      });
      setReceipt(result);
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (receipt)
    return (
      <div
        role="status"
        className="mx-auto max-w-2xl rounded-2xl border border-line bg-white p-6 shadow-card"
      >
        <h2 className="text-xl font-bold">Saved for private review</h2>
        <p className="mt-3 text-sm text-muted">
          Your observation is pending review. Nothing has been published.
        </p>
        <p className="mt-3 break-all font-mono text-xs">
          Reference: {receipt.id}
        </p>
        <p className="mt-2 text-xs text-muted">
          Keep this reference. Public lookup becomes available only if a
          sanitized record is approved.
        </p>
      </div>
    );
  const blocked =
    busy ||
    location.state.status === "locating" ||
    location.state.status === "checking";
  return (
    <form onSubmit={submit} noValidate className="mx-auto max-w-2xl space-y-4">
      <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-950">
        Contribute only when safe. Do not approach or confront people to collect
        evidence.
      </p>
      <fieldset disabled={busy} className="space-y-4">
        <section className="rounded-2xl border border-line bg-white p-5 shadow-card">
          <h2 className="mb-4 font-bold">1 - Location</h2>
          <LocationPicker
            state={location.state}
            onLocate={() => {
              setManualLocation("");
              location.locate();
            }}
            onReset={location.reset}
            manualLocation={manualLocation}
            onManualChange={setManualLocation}
          />
        </section>
        <section className="rounded-2xl border border-line bg-white p-5 shadow-card">
          <h2 className="font-bold">2 - Evidence</h2>
          <p className="mt-2 text-sm text-muted">
            This version stores observation details and location only. Image and
            video upload is not available yet; no media files are sent.
          </p>
        </section>
        <section className="space-y-4 rounded-2xl border border-line bg-white p-5 shadow-card">
          <h2 className="font-bold">3 - Context</h2>
          <label className="block text-sm font-semibold">
            Title (optional)
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={160}
              className="mt-2 h-11 w-full rounded-xl border border-line px-3"
            />
          </label>
          <label className="block text-sm font-semibold">
            What did you observe?
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={5000}
              className="mt-2 min-h-28 w-full rounded-xl border border-line p-3"
            />
          </label>
          <label className="block text-sm font-semibold">
            Date observed
            <input
              type="date"
              value={observedDate}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(event) => setObservedDate(event.target.value)}
              className="mt-2 block h-11 rounded-xl border border-line px-3"
            />
          </label>
        </section>
        <section className="rounded-2xl border border-line bg-white p-5 shadow-card">
          <h2 className="font-bold">4 - Privacy and consent</h2>
          <p className="mt-2 text-sm text-muted">
            No name, email, or phone is requested. This does not guarantee
            anonymity. Avoid personal identifiers in your description.
          </p>
          <label className="mt-4 flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              checked={consent}
              onChange={(event) => setConsent(event.target.checked)}
              className="mt-1 h-4 w-4 shrink-0"
            />
            I agree to store these details and the supplied location for private
            review.
          </label>
        </section>
      </fieldset>
      {error && (
        <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-alert">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={blocked}
        className="w-full rounded-xl bg-forest-800 px-5 py-3 font-bold text-white disabled:opacity-60"
      >
        {busy ? "Saving..." : "Submit observation"}
      </button>
    </form>
  );
}
