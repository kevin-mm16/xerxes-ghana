"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  Alert,
  Button,
  Field,
  Icon,
  Input,
  Progress,
  SectionLabel,
  Textarea,
  UploadZone,
} from "@/components/ui";
import { useLocationCoverage } from "@/hooks/useLocationCoverage";
import { submitObservation } from "@/services/api";
import type {
  SubmissionReceipt,
  UploadIntent,
  UploadStatus,
} from "@/types/api";
import {
  createUploadIntent,
  getUploadStatus,
  uploadEvidence,
  validateEvidenceFile,
} from "@/services/uploads";
import { LocationPicker } from "./LocationPicker";
import { ContributionSteps, contributionSteps } from "./ContributionSteps";
import { ContributionReview } from "./ContributionReview";
import { PrivateSubmissionReceipt } from "./PrivateSubmissionReceipt";

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
  const [submissionId] = useState(() => crypto.randomUUID());
  const [file, setFile] = useState<File>();
  const [fileError, setFileError] = useState("");
  const [progress, setProgress] = useState<number>();
  const [phase, setPhase] = useState("");
  const [mediaStatus, setMediaStatus] = useState<UploadStatus>();
  const [statusMessage, setStatusMessage] = useState("");
  const [pollAttempt, setPollAttempt] = useState(0);
  const [step, setStep] = useState(0);
  const upload = useRef<
    { intent: UploadIntent; status?: UploadStatus } | undefined
  >(undefined);
  const heading = useRef<HTMLHeadingElement>(null);
  const previousStep = useRef(step);
  const errorMessage = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (previousStep.current !== step) {
      heading.current?.focus();
      previousStep.current = step;
    }
  }, [step]);

  useEffect(() => {
    if (error) errorMessage.current?.focus();
  }, [error]);

  useEffect(() => {
    if (!receipt || !upload.current) return;
    const intent = upload.current.intent;
    const controller = new AbortController();
    const started = Date.now();
    let timer: ReturnType<typeof setTimeout>;
    setStatusMessage("");
    async function poll() {
      try {
        const status = await getUploadStatus(intent, controller.signal);
        if (controller.signal.aborted) return;
        setMediaStatus(status);
        if (
          ["review_ready", "failed", "expired"].includes(
            status.processingStatus,
          )
        )
          return;
        if (Date.now() - started >= 60000) {
          setStatusMessage("Processing is still pending. You can check again.");
          return;
        }
        timer = setTimeout(poll, 2500);
      } catch {
        if (!controller.signal.aborted)
          setStatusMessage(
            "Processing status is unavailable. Your saved observation remains private.",
          );
      }
    }
    if (
      !["review_ready", "failed", "expired"].includes(
        receipt.media?.processingStatus ??
          upload.current.status?.processingStatus ??
          "quarantined",
      )
    )
      void poll();
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [receipt, pollAttempt]);

  function chooseFile(selected?: File) {
    upload.current = undefined;
    setFile(selected);
    setProgress(undefined);
    setFileError("");
    setError("");
    if (selected) {
      try {
        validateEvidenceFile(selected);
      } catch (reason) {
        setFileError((reason as Error).message);
      }
    }
  }

  function moveTo(next: number) {
    setError("");
    setStep(next);
  }

  function locationError() {
    if (!location.state.capture && !manualLocation.trim())
      return "Choose a location or describe an approximate area.";
    if (location.state.capture && location.state.status !== "complete")
      return "Complete the coverage check before submitting.";
    return "";
  }

  function detailsError() {
    if (!description.trim()) return "Describe what you observed.";
    if (!observedDate) return "Choose the observation date.";
    if (observedDate > new Date().toISOString().slice(0, 10))
      return "Choose today or an earlier observation date.";
    return "";
  }

  function evidenceIsValid() {
    if (!file) return true;
    try {
      validateEvidenceFile(file);
      return true;
    } catch (reason) {
      setFileError((reason as Error).message);
      return false;
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (step < 3) {
      const message =
        step === 0 ? locationError() : step === 2 ? detailsError() : "";
      if (message) {
        setError(message);
        return;
      }
      if (step === 1 && !evidenceIsValid()) {
        setError(
          "Choose a supported file or remove the attachment to continue.",
        );
        return;
      }
      moveTo(step + 1);
      return;
    }
    const invalidLocation = locationError();
    if (invalidLocation) {
      setStep(0);
      setError(invalidLocation);
      return;
    }
    if (!evidenceIsValid()) {
      setStep(1);
      setError("Choose a supported file or remove the attachment to continue.");
      return;
    }
    const invalidDetails = detailsError();
    if (invalidDetails) {
      setStep(2);
      setError(invalidDetails);
      return;
    }
    if (!consent) {
      setError("Agree to private storage and review before submitting.");
      return;
    }
    setBusy(true);
    try {
      if (file) {
        setPhase("Preparing private upload...");
        if (
          !upload.current ||
          Date.parse(upload.current.intent.expiresAt) <= Date.now()
        ) {
          upload.current = { intent: await createUploadIntent(file) };
        }
        if (!upload.current.status) {
          setPhase("Uploading private evidence...");
          setProgress(0);
          upload.current.status = await uploadEvidence(
            upload.current.intent,
            file,
            setProgress,
          );
        }
        if (
          ["failed", "expired"].includes(upload.current.status.processingStatus)
        ) {
          throw new Error(
            "This file could not be accepted. Remove it and select a valid file to try again.",
          );
        }
      }
      setPhase("Saving observation...");
      const result = await submitObservation({
        submissionId,
        title: title.trim() || undefined,
        description: description.trim(),
        observedAt: new Date(`${observedDate}T00:00:00Z`).toISOString(),
        captureLocation: location.state.capture,
        manualLocation: manualLocation.trim() || undefined,
        anonymous: true,
        consent: true,
        mediaType: "none",
        media: upload.current
          ? {
              uploadId: upload.current.intent.id,
              uploadToken: upload.current.intent.uploadToken,
            }
          : undefined,
      });
      setMediaStatus(result.media ?? upload.current?.status);
      setReceipt(result);
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (receipt)
    return (
      <PrivateSubmissionReceipt
        receipt={receipt}
        mediaStatus={mediaStatus}
        statusMessage={statusMessage}
        onCheck={() => setPollAttempt((attempt) => attempt + 1)}
      />
    );
  const blocked =
    busy ||
    location.state.status === "locating" ||
    location.state.status === "checking";
  const fileStored = Boolean(
    upload.current?.status &&
      !["failed", "expired"].includes(upload.current.status.processingStatus),
  );
  return (
    <form
      onSubmit={submit}
      noValidate
      className="mx-auto max-w-3xl"
      aria-label="Contribute an observation"
      aria-busy={busy}
    >
      <ContributionSteps current={step} disabled={blocked} onBack={moveTo} />
      <div className="mt-7 flex items-center gap-2 text-xs leading-5 text-muted">
        <Icon name="alert" className="h-4 w-4 shrink-0 text-earth" />
        <p>
          Contribute only when safe. Do not approach or confront people to
          collect evidence.
        </p>
      </div>
      <fieldset disabled={busy} className="min-w-0">
        <div className="pb-7 pt-8 sm:pt-10">
          <SectionLabel>
            Step {step + 1} of 4 · {contributionSteps[step]}
          </SectionLabel>
          <h2
            ref={heading}
            tabIndex={-1}
            className="mt-3 text-xl font-semibold tracking-tight outline-none sm:text-2xl"
          >
            {
              [
                "Where did you observe this?",
                "Add supporting evidence",
                "Describe what you observed",
                "Review your observation",
              ][step]
            }
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-7 text-muted">
            {
              [
                "Use your current position or describe an approximate area. Your location is used for private coverage review.",
                fileStored
                  ? "Your file is stored privately. Keep it attached, choose a replacement, or continue with details only."
                  : "Attach one image or video, or continue with details only. Your file stays on this device until you consent and submit.",
                "Share what you saw, where useful, and when. Keep the description factual and leave out personal identifiers.",
                "Check the details below before sending them for private review. Nothing is published automatically.",
              ][step]
            }
          </p>
        </div>
        {step === 0 && (
          <section aria-label="Observation location" className="pb-5">
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
        )}
        {step === 1 && (
          <section aria-label="Supporting evidence" className="space-y-5 pb-5">
            <UploadZone
              file={file}
              onFile={chooseFile}
              onError={setFileError}
              error={fileError}
              disabled={busy}
              accept=".jpg,.jpeg,.png,.webp,.mp4,.mov,image/jpeg,image/png,image/webp,video/mp4,video/quicktime"
            />
            <p className="text-xs leading-6 text-muted">
              Images: JPEG, PNG or WebP up to 10 MB. Videos: MP4 or MOV up to 50
              MB and 2 minutes.
            </p>
            <Alert tone="neutral" title="Evidence remains private">
              Originals and processed copies stay private. Files may contain
              identifying faces, voices or landmarks. Preparing a review copy
              does not make it safe for publication.
            </Alert>
          </section>
        )}
        {step === 2 && (
          <section aria-label="Observation details" className="space-y-6 pb-5">
            <Field
              label="Title (optional)"
              help="A short description of the observation."
            >
              <Input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={160}
              />
            </Field>
            <Field
              label="What did you observe?"
              required
              help="Describe visible activity or environmental changes. Avoid names, contact details and speculation."
            >
              <Textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                maxLength={5000}
                rows={5}
                required
                aria-invalid={Boolean(error && !description.trim())}
                aria-describedby={
                  error && !description.trim()
                    ? "contribution-error"
                    : undefined
                }
              />
            </Field>
            <Field label="Date observed" required>
              <Input
                type="date"
                required
                value={observedDate}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(event) => setObservedDate(event.target.value)}
                className="sm:max-w-56"
                aria-invalid={Boolean(
                  error &&
                    (!observedDate ||
                      observedDate > new Date().toISOString().slice(0, 10)),
                )}
              />
            </Field>
          </section>
        )}
        {step === 3 && (
          <section aria-label="Review and consent" className="space-y-7 pb-5">
            <ContributionReview
              title={title}
              description={description}
              observedDate={observedDate}
              manualLocation={manualLocation}
              capture={location.state.capture}
              file={file}
              fileUploaded={fileStored}
              onEdit={moveTo}
            />
            <div>
              <h3 className="text-sm font-semibold">
                Private storage and review
              </h3>
              <p className="mt-2 text-sm leading-7 text-muted">
                No name, email or phone is requested. This does not guarantee
                anonymity. The supplied location and any evidence are held
                privately for review.
              </p>
            </div>
            <label className="flex cursor-pointer items-start gap-3 border-y border-line py-5 text-sm leading-6">
              <input
                type="checkbox"
                required
                checked={consent}
                onChange={(event) => setConsent(event.target.checked)}
                className="mt-1 h-4 w-4 shrink-0 accent-forest-600"
                aria-invalid={Boolean(error && !consent)}
                aria-describedby={
                  error && !consent ? "contribution-error" : undefined
                }
              />
              I agree to store these details, the supplied location, and any
              attached file for private processing and review.
            </label>
          </section>
        )}
      </fieldset>
      {error && (
        <div
          id="contribution-error"
          ref={errorMessage}
          tabIndex={-1}
          className="mb-5 outline-none"
        >
          <Alert tone="red">{error}</Alert>
        </div>
      )}
      {busy && (
        <div role="status" className="mb-6 text-sm">
          <p className="mb-3">{phase}</p>
          {file && (
            <Progress value={progress} label="Private upload progress" />
          )}
        </div>
      )}
      <div className="mt-4 flex flex-col-reverse gap-3 border-t border-line pt-5 sm:flex-row sm:items-center sm:justify-between">
        {step > 0 ? (
          <Button
            type="button"
            variant="ghost"
            disabled={blocked}
            onClick={() => moveTo(step - 1)}
          >
            <Icon name="arrow-left" className="h-4 w-4" />
            Back
          </Button>
        ) : (
          <p className="text-center text-xs text-muted sm:text-left">
            Your contribution is reviewed privately.
          </p>
        )}
        <Button type="submit" disabled={blocked} className="w-full sm:w-auto">
          {busy
            ? "Submitting…"
            : step === 3
              ? "Submit observation"
              : `Continue to ${contributionSteps[step + 1].toLowerCase()}`}
          {!busy && step < 3 && <Icon name="arrow-right" className="h-4 w-4" />}
        </Button>
      </div>
    </form>
  );
}
