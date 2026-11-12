"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { Alert, Badge, Button, Field, Input, Textarea } from "@/components/ui";
import { saveReviewedLocation } from "@/services/moderation";
import type { ModerationObservation } from "@/types/moderation";
import type { ReviewAction } from "./ReviewWorkspace";

const PrivateLocationMap = dynamic(
  () => import("./ReviewedLocationMapCanvas"),
  {
    ssr: false,
    loading: () => (
      <p role="status" className="border border-line p-5 text-xs text-muted">
        Loading private location map…
      </p>
    ),
  },
);
export function ReviewedLocationEditor({
  observation,
  csrfToken,
  busy,
  editable,
  onAction,
}: {
  observation: ModerationObservation;
  csrfToken: string;
  busy: boolean;
  editable: boolean;
  onAction: ReviewAction;
}) {
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [reason, setReason] = useState("");
  const [mapOpen, setMapOpen] = useState(false);
  const [showCapture, setShowCapture] = useState(false);
  const [focus, setFocus] = useState<{
    latitude: number;
    longitude: number;
    nonce: number;
  }>();
  const [error, setError] = useState("");
  const geometry = observation.observationLocation?.geometry;
  const savedPoint =
    geometry?.type === "Point"
      ? geometry.coordinates.join(",")
      : geometry?.type;
  useEffect(() => {
    setLatitude(
      geometry?.type === "Point" ? String(geometry.coordinates[1]) : "",
    );
    setLongitude(
      geometry?.type === "Point" ? String(geometry.coordinates[0]) : "",
    );
  }, [observation.id, savedPoint]);
  const point =
    latitude.trim() &&
    longitude.trim() &&
    Number.isFinite(Number(latitude)) &&
    Number.isFinite(Number(longitude))
      ? ([Number(longitude), Number(latitude)] as [number, number])
      : undefined;
  async function save() {
    setError("");
    if (
      !point ||
      point[1] < 4.1 ||
      point[1] > 11.5 ||
      point[0] < -3.6 ||
      point[0] > 1.6
    ) {
      setError(
        "Choose a reviewed activity point within the Ghana review area.",
      );
      return;
    }
    if (reason.trim().length < 5) {
      setError(
        "Explain why this is the reviewed activity location (at least 5 characters).",
      );
      return;
    }
    await onAction(
      () =>
        saveReviewedLocation(
          observation.id,
          csrfToken,
          point[0],
          point[1],
          reason.trim(),
        ),
      "Reviewed activity location saved. Public geography will be generated separately.",
    );
  }
  return (
    <section
      id="reviewed-location"
      aria-labelledby="reviewed-location-heading"
      className="border-b border-line p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 id="reviewed-location-heading" className="text-sm font-semibold">
          Reviewed activity location
        </h3>
        <Badge tone={observation.observationLocation ? "green" : "amber"}>
          {observation.observationLocation ? "Established" : "Required"}
        </Badge>
      </div>
      <p className="mt-3 text-xs leading-6 text-muted">
        Choose where the environmental activity occurred. The contributor’s
        device position is private context and is never copied automatically
        into this location.
      </p>
      {geometry && geometry.type !== "Point" && (
        <Alert tone="amber" className="mt-4">
          A reviewed {geometry.type} is already stored. Saving a point replaces
          it and records the reason in location history.
        </Alert>
      )}
      {!mapOpen ? (
        <Button
          variant="secondary"
          size="sm"
          className="mt-4"
          onClick={() => setMapOpen(true)}
        >
          Open private location map
        </Button>
      ) : (
        <div className="mt-4 space-y-3">
          <Alert tone="neutral">
            Satellite providers receive tile requests for areas viewed. Click to
            place the activity point, then save it with a reason. Capture
            context appears only if you enable it.
          </Alert>
          <PrivateLocationMap
            point={point}
            existingGeometry={geometry}
            capture={observation.captureLocation}
            showCapture={showCapture}
            focus={focus}
            disabled={busy || !editable}
            onPoint={([lng, lat]) => {
              setLongitude(lng.toFixed(6));
              setLatitude(lat.toFixed(6));
            }}
          />
          <div className="flex flex-wrap gap-2">
            {point && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() =>
                  setFocus({
                    latitude: point[1],
                    longitude: point[0],
                    nonce: Date.now(),
                  })
                }
              >
                Focus activity point
              </Button>
            )}
            {observation.captureLocation && (
              <Button
                size="sm"
                variant="secondary"
                aria-pressed={showCapture}
                onClick={() => {
                  setShowCapture(!showCapture);
                  if (!showCapture && observation.captureLocation)
                    setFocus({
                      ...observation.captureLocation,
                      nonce: Date.now(),
                    });
                }}
              >
                {showCapture
                  ? "Hide capture context"
                  : "Show private capture context"}
              </Button>
            )}
          </div>
        </div>
      )}
      <fieldset disabled={busy || !editable} className="mt-5 min-w-0 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Activity latitude" required>
            <Input
              type="number"
              step="any"
              value={latitude}
              onChange={(event) => setLatitude(event.target.value)}
            />
          </Field>
          <Field label="Activity longitude" required>
            <Input
              type="number"
              step="any"
              value={longitude}
              onChange={(event) => setLongitude(event.target.value)}
            />
          </Field>
        </div>
        <Field
          label="Location review reason"
          required
          help="Explain the evidence used. Do not identify the contributor."
        >
          <Textarea
            rows={3}
            className="min-h-[90px]"
            value={reason}
            maxLength={1000}
            onChange={(event) => setReason(event.target.value)}
          />
        </Field>
        {error && <Alert tone="red">{error}</Alert>}
        <Button size="sm" onClick={() => void save()}>
          Save reviewed location
        </Button>
      </fieldset>
      {observation.observationLocation && (
        <p className="mt-4 text-[10px] leading-5 text-muted">
          Saved{" "}
          {new Date(
            observation.observationLocation.reviewedAt,
          ).toLocaleString()}{" "}
          · reviewer {observation.observationLocation.reviewedBy}
        </p>
      )}
    </section>
  );
}
