"use client";

import type { LocationState } from "@/hooks/useLocationCoverage";
import { CoverageStatus } from "./CoverageStatus";

interface Props {
  state: LocationState;
  onLocate: () => void;
  onReset: () => void;
  manualLocation: string;
  onManualChange: (value: string) => void;
}
export function LocationPicker({
  state,
  onLocate,
  onReset,
  manualLocation,
  onManualChange,
}: Props) {
  const busy = state.status === "locating" || state.status === "checking";
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">
        Share your browser location with XERSXES to check monitoring coverage.
        Permission is requested only when you choose below.
      </p>
      <button
        type="button"
        onClick={onLocate}
        disabled={busy}
        className="rounded-xl bg-forest-800 px-4 py-3 text-sm font-bold text-white disabled:opacity-60"
      >
        {state.status === "locating"
          ? "Getting location..."
          : state.status === "checking"
            ? "Checking coverage..."
            : "Use my location & check coverage"}
      </button>
      {state.capture && (
        <p className="text-xs text-muted">
          Reported accuracy: {Math.round(state.capture.accuracyMeters)} m. Exact
          capture coordinates are kept out of public responses.
        </p>
      )}
      {state.result && <CoverageStatus result={state.result} />}
      {state.error && (
        <p role="alert" className="text-sm text-alert">
          {state.error}
        </p>
      )}
      <details
        className="rounded-xl border border-line p-3"
        open={Boolean(manualLocation)}
      >
        <summary className="cursor-pointer text-sm font-semibold">
          Use a manual location instead
        </summary>
        <label className="mt-3 block text-sm">
          Approximate area or landmark
          <input
            value={manualLocation}
            maxLength={500}
            onChange={(event) => {
              onReset();
              onManualChange(event.target.value);
            }}
            className="mt-2 h-11 w-full rounded-xl border border-line px-3"
          />
        </label>
        <p className="mt-2 text-xs text-muted">
          Manual descriptions require review and cannot be spatially checked
          yet.
        </p>
      </details>
    </div>
  );
}
