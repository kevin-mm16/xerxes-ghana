import { FormEvent, useMemo, useState } from "react";
import type { Coordinates } from "@/types";
import { AnonymousToggle } from "@/components/forms/AnonymousToggle";
import { LocationPickerPlaceholder } from "@/components/forms/LocationPickerPlaceholder";
import { UploadBox, type UploadState } from "@/components/forms/UploadBox";
import { SafetyNotice } from "@/components/ui/SafetyNotice";
import { ghanaRegions } from "@/data/mockReports";

interface FormState {
  title: string;
  region: string;
  district: string;
  manualLocation: string;
  description: string;
  dateObserved: string;
  anonymous: boolean;
  detectedCoordinates?: Coordinates;
}

const initialState: FormState = {
  title: "",
  region: "",
  district: "",
  manualLocation: "",
  description: "",
  dateObserved: "",
  anonymous: true,
};

export function ReportSubmissionForm() {
  const [form, setForm] = useState<FormState>(initialState);
  const [uploadState, setUploadState] = useState<UploadState>("Idle");
  const [submitted, setSubmitted] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const hasLocation = useMemo(
    () => Boolean(form.detectedCoordinates) || form.manualLocation.trim().length > 0 || Boolean(form.region && form.district),
    [form],
  );
  const hasEvidence = uploadState === "Uploaded" || form.description.trim().length > 0;

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setSubmitted(false);
    setDraftSaved(false);
  };

  const simulateUpload = () => {
    setUploadState("Uploading");
    window.setTimeout(() => setUploadState("Uploaded"), 700);
  };

  const saveDraft = () => {
    setDraftSaved(true);
    setSubmitted(false);
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors: string[] = [];

    if (!hasLocation) {
      nextErrors.push("Location is required. Use the location preview, region/district, or a manual location note.");
    }

    if (!hasEvidence) {
      nextErrors.push("Add a description or simulate attaching media evidence.");
    }

    setErrors(nextErrors);

    if (nextErrors.length === 0) {
      setSubmitted(true);
      setDraftSaved(false);
    }
  };

  return (
    <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[1.35fr_0.9fr]">
      <div className="rounded-3xl border border-line bg-white p-5 shadow-card sm:p-8">
        <div className="mb-6 space-y-4">
          <SafetyNotice title="Safety warning">
            Do not put yourself in danger. Do not confront miners. Submit reports only when it is safe.
          </SafetyNotice>
          <SafetyNotice title="Privacy note" tone="privacy">
            Anonymous reports do not require your name, phone number, or email. Sensitive details are reviewed
            privately before anything appears publicly.
          </SafetyNotice>
        </div>

        <div className="grid gap-5">
          <label className="block">
            <span className="mb-2 block text-sm font-bold">Report title</span>
            <input
              value={form.title}
              onChange={(event) => update("title", event.target.value)}
              placeholder="Example: Dredging activity near the Offin"
              className="h-12 w-full rounded-xl border border-line bg-[#fdfdfc] px-4 outline-none focus:border-forest-600"
            />
            <span className="mt-1 block text-xs text-muted">Helpful but not the only required field.</span>
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-bold">Region</span>
              <select
                value={form.region}
                onChange={(event) => update("region", event.target.value)}
                className="h-12 w-full rounded-xl border border-line bg-[#fdfdfc] px-4 outline-none focus:border-forest-600"
              >
                <option value="">Select region</option>
                {ghanaRegions.map((region) => (
                  <option key={region.name} value={region.name}>
                    {region.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-bold">District or town</span>
              <input
                value={form.district}
                onChange={(event) => update("district", event.target.value)}
                placeholder="Example: Upper Denkyira East"
                className="h-12 w-full rounded-xl border border-line bg-[#fdfdfc] px-4 outline-none focus:border-forest-600"
              />
            </label>
          </div>

          <label className="block">
            <span className="mb-2 block text-sm font-bold">Manual location text</span>
            <input
              value={form.manualLocation}
              onChange={(event) => update("manualLocation", event.target.value)}
              placeholder="Use landmarks or approximate area. Avoid naming private individuals."
              className="h-12 w-full rounded-xl border border-line bg-[#fdfdfc] px-4 outline-none focus:border-forest-600"
            />
          </label>

          <UploadBox
            state={uploadState}
            onSimulateUpload={simulateUpload}
            onFail={() => setUploadState("Failed")}
          />

          <label className="block">
            <span className="mb-2 block text-sm font-bold">Description</span>
            <textarea
              value={form.description}
              onChange={(event) => update("description", event.target.value)}
              placeholder="What did you observe? Is a river, forest, farm, or community affected?"
              className="min-h-36 w-full rounded-xl border border-line bg-[#fdfdfc] px-4 py-3 leading-7 outline-none focus:border-forest-600"
            />
          </label>

          <label className="block sm:max-w-xs">
            <span className="mb-2 block text-sm font-bold">Date observed</span>
            <input
              type="date"
              value={form.dateObserved}
              onChange={(event) => update("dateObserved", event.target.value)}
              className="h-12 w-full rounded-xl border border-line bg-[#fdfdfc] px-4 outline-none focus:border-forest-600"
            />
          </label>

          <AnonymousToggle checked={form.anonymous} onChange={(checked) => update("anonymous", checked)} />

          {errors.length > 0 ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-950">
              <p className="font-bold">Please fix the following before submitting:</p>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                {errors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {draftSaved ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900">
              Draft saved locally in this browser session.
            </div>
          ) : null}

          {submitted ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-900">
              Submission preview complete. No data was sent because the backend is not connected yet.
            </div>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={saveDraft}
              className="rounded-xl border border-line bg-white px-5 py-3 text-sm font-bold text-forest-800 hover:bg-forest-50"
            >
              Save draft
            </button>
            <button
              type="submit"
              className="rounded-xl bg-alert px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-red-800 sm:flex-1"
            >
              Submit report
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-5 lg:sticky lg:top-24 lg:self-start">
        <LocationPickerPlaceholder
          coordinates={form.detectedCoordinates}
          onDetect={(coordinates) => update("detectedCoordinates", coordinates)}
        />
        <div className="rounded-2xl border border-line bg-white p-5 shadow-card">
          <h2 className="font-bold">Helpful evidence</h2>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-muted">
            <li>Wide shots showing machinery, water colour, or land clearing.</li>
            <li>Affected rivers, farms, forest edges, or access roads.</li>
            <li>Approximate place names or landmarks without naming private people.</li>
          </ul>
        </div>
        <div className="rounded-2xl border border-line bg-white p-5 shadow-card">
          <h2 className="font-bold">Private review first</h2>
          <p className="mt-3 text-sm leading-6 text-muted">
            Exact location and raw media are intended for private moderator review before any public summary appears.
          </p>
        </div>
      </div>
    </form>
  );
}
