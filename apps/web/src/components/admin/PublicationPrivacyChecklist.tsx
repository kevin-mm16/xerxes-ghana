"use client";

import type { PrivacyChecklist } from "@/types/moderation";

const fields: Array<{ key: keyof PrivacyChecklist; label: string }> = [
  {
    key: "summaryReviewed",
    label:
      "I reviewed the public title and summary for sensitive or identifying details.",
  },
  {
    key: "locationReviewed",
    label:
      "I reviewed the activity location and selected a public location policy that protects the source.",
  },
  {
    key: "identifiersClear",
    label:
      "No sensitive visual/audio identifiers remain in media selected for publication; the public text and location also protect source identities.",
  },
];
export function PublicationPrivacyChecklist({
  value,
  onChange,
}: {
  value: PrivacyChecklist;
  onChange: (value: PrivacyChecklist) => void;
}) {
  return (
    <div id="review-checklist" className="space-y-3 border-y border-line py-5">
      {fields.map((field) => (
        <label
          key={field.key}
          className="flex items-start gap-3 text-xs leading-6"
        >
          <input
            type="checkbox"
            checked={value[field.key]}
            onChange={(event) =>
              onChange({ ...value, [field.key]: event.target.checked })
            }
            className="mt-1 h-4 w-4 shrink-0"
          />
          {field.label}
        </label>
      ))}
      <p className="text-[11px] leading-6 text-muted">
        Inspect faces, voices, plates and landmarks yourself. Public processing
        strips metadata and re-encodes; it does not provide automatic visual or
        audio redaction. Exclude media if this certification cannot be made.
      </p>
    </div>
  );
}
