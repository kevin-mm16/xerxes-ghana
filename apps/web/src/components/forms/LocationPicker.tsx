"use client";

import type { LocationState } from "@/hooks/useLocationCoverage";
import {
  Alert,
  Button,
  Field,
  Icon,
  Input,
  SectionLabel,
} from "@/components/ui";
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
    <div className="space-y-6">
      <div className="border-y border-line py-6">
        <div className="mb-5 flex items-start gap-3">
          <Icon
            name="location"
            className="mt-0.5 h-5 w-5 shrink-0 text-forest-600"
          />
          <div>
            <h3 className="text-sm font-semibold">Use your current location</h3>
            <p className="mt-2 max-w-lg text-sm leading-6 text-muted">
              Your browser will ask for permission. XERSXES checks your reported
              position and accuracy against monitoring coverage.
            </p>
          </div>
        </div>
        <Button
          type="button"
          onClick={onLocate}
          disabled={busy}
          variant="secondary"
          className="w-full sm:w-auto"
        >
          {state.status === "locating"
            ? "Getting location..."
            : state.status === "checking"
              ? "Checking coverage..."
              : "Use my location & check coverage"}
        </Button>
        {state.capture && (
          <p className="mt-4 text-xs leading-6 text-muted">
            Reported accuracy: {Math.round(state.capture.accuracyMeters)} m.
            Exact capture coordinates are kept out of public responses.
          </p>
        )}
      </div>
      {state.result && <CoverageStatus result={state.result} />}
      {state.error && (
        <Alert tone="amber" role="alert">
          {state.error}
        </Alert>
      )}
      <details
        className="group border-b border-line pb-6"
        open={Boolean(manualLocation)}
      >
        <summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold">
          Use a manual location instead
        </summary>
        <div className="pt-2">
          <Field
            label="Approximate area or landmark"
            help="Use a nearby settlement, river, road or public landmark. Do not include your home address."
          >
            <Input
              value={manualLocation}
              maxLength={500}
              onChange={(event) => {
                onReset();
                onManualChange(event.target.value);
              }}
            />
          </Field>
          <p className="mt-3 text-xs leading-6 text-muted">
            Manual descriptions require review and cannot be spatially checked
            yet.
          </p>
        </div>
      </details>
      <div className="flex items-start gap-3 text-xs leading-6 text-muted">
        <SectionLabel>Privacy</SectionLabel>
        <p>
          Exact capture coordinates are excluded from public responses. An
          approved public record uses a separately reviewed location.
        </p>
      </div>
    </div>
  );
}
