import type { ReactNode } from "react";
import { Button, SectionLabel } from "@/components/ui";
import type { CaptureLocation } from "@/types/api";

function ReviewRow({
  label,
  onEdit,
  children,
}: {
  label: string;
  onEdit: () => void;
  children: ReactNode;
}) {
  return (
    <section className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 py-5 sm:grid-cols-[8rem_minmax(0,1fr)_auto]">
      <SectionLabel>{label}</SectionLabel>
      <div className="col-span-2 col-start-1 row-start-2 min-w-0 text-sm leading-6 sm:col-span-1 sm:col-start-2 sm:row-start-1">
        {children}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="col-start-2 row-start-1 justify-self-end sm:col-start-3"
        onClick={onEdit}
        aria-label={`Edit ${label.toLowerCase()}`}
      >
        Edit
      </Button>
    </section>
  );
}

export function ContributionReview({
  title,
  description,
  observedDate,
  manualLocation,
  capture,
  file,
  fileUploaded,
  onEdit,
}: {
  title: string;
  description: string;
  observedDate: string;
  manualLocation: string;
  capture?: CaptureLocation;
  file?: File;
  fileUploaded: boolean;
  onEdit: (step: number) => void;
}) {
  const dateLabel = new Date(`${observedDate}T00:00:00Z`).toLocaleDateString(
    "en-GB",
    {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    },
  );
  return (
    <div className="divide-y divide-line border-y border-line">
      <ReviewRow label="Location" onEdit={() => onEdit(0)}>
        <p className="break-words font-medium">
          {capture ? "Browser location captured" : manualLocation}
        </p>
        <p className="text-muted">
          {capture
            ? `Reported accuracy: ${Math.round(capture.accuracyMeters)} m. Exact coordinates stay private.`
            : "Approximate description · requires location review"}
        </p>
      </ReviewRow>
      <ReviewRow label="Evidence" onEdit={() => onEdit(1)}>
        <p className="break-all font-medium">
          {file ? file.name : "Details only"}
        </p>
        <p className="text-muted">
          {file
            ? `${(file.size / 1024 / 1024).toFixed(2)} MB · ${fileUploaded ? "stored privately" : "not uploaded yet"}`
            : "No file attached"}
        </p>
      </ReviewRow>
      <ReviewRow label="Details" onEdit={() => onEdit(2)}>
        {title.trim() && (
          <p className="break-words font-semibold">{title.trim()}</p>
        )}
        <p className="whitespace-pre-wrap break-words">{description.trim()}</p>
        <p className="mt-2 text-muted">Observed {dateLabel}</p>
      </ReviewRow>
    </div>
  );
}
