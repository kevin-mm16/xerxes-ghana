"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
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
  mediaFailureMessage,
  uploadEvidence,
  validateEvidenceFile,
} from "@/services/uploads";
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
  const [submissionId] = useState(() => crypto.randomUUID());
  const [file, setFile] = useState<File>();
  const [fileError, setFileError] = useState("");
  const [progress, setProgress] = useState<number>();
  const [phase, setPhase] = useState("");
  const [mediaStatus, setMediaStatus] = useState<UploadStatus>();
  const [statusMessage, setStatusMessage] = useState("");
  const [pollAttempt, setPollAttempt] = useState(0);
  const upload = useRef<
    { intent: UploadIntent; status?: UploadStatus } | undefined
  >(undefined);
  const fileInput = useRef<HTMLInputElement>(null);

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
    if (file) {
      try {
        validateEvidenceFile(file);
      } catch (reason) {
        setFileError((reason as Error).message);
        return;
      }
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
      <div
        role="status"
        className="mx-auto max-w-2xl rounded-2xl border border-line bg-white p-6 shadow-card"
      >
        <h2 className="text-xl font-bold">Saved for private review</h2>
        <p className="mt-3 text-sm text-muted">
          Your observation is pending review. Nothing has been published.
        </p>
        {mediaStatus && (
          <div
            className="mt-4 rounded-xl bg-forest-50 p-3 text-sm"
            data-testid="media-processing-status"
          >
            {mediaStatus.processingStatus === "review_ready"
              ? "Your file has been processed and is ready for private review."
              : ["failed", "expired"].includes(mediaStatus.processingStatus)
                ? mediaFailureMessage(mediaStatus)
                : "Your file is stored privately and is being prepared for review."}
          </div>
        )}
        {statusMessage && (
          <p className="mt-3 text-sm text-muted">
            {statusMessage}{" "}
            <button
              type="button"
              className="font-semibold underline"
              onClick={() => setPollAttempt((attempt) => attempt + 1)}
            >
              Check processing status
            </button>
          </p>
        )}
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
            Attach one image or video, or submit details only. Images: JPEG,
            PNG, or WebP up to 10 MB. Videos: MP4 or MOV up to 50 MB and 2
            minutes.
          </p>
          <label className="mt-4 block text-sm font-semibold">
            Image or video (optional)
            <input
              ref={fileInput}
              type="file"
              accept=".jpg,.jpeg,.png,.webp,.mp4,.mov,image/jpeg,image/png,image/webp,video/mp4,video/quicktime"
              className="mt-2 block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-forest-50 file:px-3 file:py-2 file:font-semibold"
              onChange={(event) => chooseFile(event.target.files?.[0])}
            />
          </label>
          {file && (
            <div className="mt-3 flex items-start justify-between gap-3 rounded-xl bg-paper p-3 text-sm">
              <span className="min-w-0 break-all">
                {file.name}{" "}
                <span className="text-muted">
                  ({(file.size / 1024 / 1024).toFixed(2)} MB)
                </span>
              </span>
              <button
                type="button"
                className="shrink-0 font-semibold underline"
                onClick={() => {
                  chooseFile();
                  if (fileInput.current) fileInput.current.value = "";
                }}
              >
                Remove file
              </button>
            </div>
          )}
          {fileError && (
            <p role="alert" className="mt-2 text-sm text-alert">
              {fileError}
            </p>
          )}
          <p className="mt-3 text-xs leading-5 text-muted">
            Files upload only when you consent and submit. Originals and
            processed copies stay private. Files may contain identifying faces,
            voices or landmarks; preparing a review copy does not make it safe
            for publication.
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
            I agree to store these details, the supplied location, and any
            attached file for private processing and review.
          </label>
        </section>
      </fieldset>
      {error && (
        <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-alert">
          {error}
        </p>
      )}
      {busy && file && (
        <div role="status" className="rounded-xl bg-white p-3 text-sm">
          {phase}
          {progress !== undefined && (
            <>
              <span className="ml-2">{progress}%</span>
              <progress
                aria-label="Private upload progress"
                className="mt-2 block h-2 w-full"
                value={progress}
                max={100}
              />
            </>
          )}
        </div>
      )}
      <button
        type="submit"
        disabled={blocked}
        className="w-full rounded-xl bg-forest-800 px-5 py-3 font-bold text-white disabled:opacity-60"
      >
        {busy ? phase || "Saving..." : "Submit observation"}
      </button>
    </form>
  );
}
