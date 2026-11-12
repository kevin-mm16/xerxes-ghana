import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { PublicMediaPlayer } from "@/components/evidence/PublicMediaPlayer";
import { IntelligenceDrawer } from "@/components/map/IntelligenceDrawer";
import { ReportDetailsPage } from "@/views/ReportDetailsPage";
import { adaptMapFeature } from "@/services/map-data";
import { safePublicMedia } from "@/utils/public-media";
import type {
  MapApiFeature,
  PublicMedia,
  PublicObservation,
} from "@/types/api";
import type { IntelligenceFeature } from "@/types/intelligence";

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
}));
vi.mock("@/components/evidence/PublicLocationMap", () => ({
  PublicLocationMap: () => <div>Generalized location map</div>,
}));

const id = "b205be00-95f7-4ce7-b81d-98e2819975fa";
const mediaId = "7d6f9503-d040-4e21-90d1-de73afc3b31b";
const media: PublicMedia = {
  id: mediaId,
  mediaKind: "video",
  mimeType: "video/mp4",
  url: `/api/v1/public-media/${mediaId}/asset`,
  thumbnailUrl: `/api/v1/public-media/${mediaId}/thumbnail`,
  width: 320,
  height: 180,
  durationSeconds: 1.2,
};
const record: PublicObservation = {
  id,
  title: "Reviewed public evidence",
  description: "Sanitized summary.",
  observedAt: "2026-11-12",
  status: "approved",
  publicLocation: { type: "Point", coordinates: [-1.5, 6] },
  publicLabel: "Generalized test area",
  precisionLevel: "grid-2000m",
  media,
};
const feature: IntelligenceFeature = {
  id,
  type: "approved_video",
  geometry: record.publicLocation,
  observedAt: record.observedAt,
  properties: {
    title: record.title,
    layer: "observations",
    source: "Public API",
    status: "Verified",
    media,
    observationId: id,
    publicLabel: record.publicLabel,
  },
};

afterEach(() => vi.unstubAllGlobals());

describe("published media trust boundary", () => {
  it("plays only the controlled public derivative with deliberate browser controls", () => {
    const { container } = render(
      <PublicMediaPlayer media={media} title={record.title} />,
    );
    const video = screen.getByLabelText(
      `Published video: ${record.title}`,
    ) as HTMLVideoElement;
    expect(video.controls).toBe(true);
    expect(video.autoplay).toBe(false);
    expect(video.playsInline).toBe(true);
    expect(video.preload).toBe("metadata");
    expect(video.getAttribute("poster")).toBe(media.thumbnailUrl);
    expect(container.querySelector("source")?.getAttribute("src")).toBe(
      media.url,
    );
    expect(container.querySelector("source")?.getAttribute("type")).toBe(
      "video/mp4",
    );
  });

  it("renders actual approved images and a restrained thumbnail-only map preview", () => {
    const image: PublicMedia = {
      ...media,
      mediaKind: "image",
      mimeType: "image/jpeg",
    };
    const { container, rerender } = render(
      <PublicMediaPlayer media={image} title={record.title} />,
    );
    expect(
      screen
        .getByRole("img", { name: `Published evidence: ${record.title}` })
        .getAttribute("src"),
    ).toBe(media.url);
    rerender(
      <PublicMediaPlayer
        media={media}
        title={record.title}
        variant="preview"
      />,
    );
    expect(
      screen
        .getByRole("img", { name: `Published video preview: ${record.title}` })
        .getAttribute("src"),
    ).toBe(media.thumbnailUrl);
    expect(container.querySelector("video")).toBeNull();
  });

  it.each([
    `https://private.invalid/${mediaId}/original`,
    `//private.invalid/${mediaId}/original`,
    `/api/v1/public-media/${mediaId}/asset?token=PRIVATE_TOKEN_SENTINEL`,
    `/api/v1/uploads/${mediaId}/content`,
    `/api/v1/public-media/${id}/asset`,
    "javascript:alert(1)",
  ])(
    "rejects a private, external, mismatched or capability-bearing URL: %s",
    (url) => {
      const { container } = render(
        <PublicMediaPlayer media={{ ...media, url }} title={record.title} />,
      );
      expect(container.querySelector("img,video,source")).toBeNull();
      expect(container.innerHTML).not.toContain("PRIVATE_TOKEN_SENTINEL");
    },
  );

  it("allowlists fields before SSR/client serialization and rejects private thumbnails or mismatched kinds", () => {
    const unsafe = {
      ...media,
      originalObjectKey: "PRIVATE_KEY_SENTINEL",
      reviewerNotes: "PRIVATE_NOTES_SENTINEL",
      captureLocation: { latitude: 5.123456789 },
    };
    const safe = safePublicMedia(unsafe);
    expect(safe).toEqual(media);
    expect(JSON.stringify(safe)).not.toMatch(
      /PRIVATE_|5\.123456789|originalObjectKey|reviewerNotes/,
    );
    expect(
      safePublicMedia({
        ...media,
        thumbnailUrl: `/api/v1/uploads/${mediaId}/content`,
      }),
    ).toBeUndefined();
    expect(safePublicMedia({ ...media, mediaKind: "image" })).toBeUndefined();
    expect(safePublicMedia({ ...media, id: "../../original" })).toBeUndefined();
  });

  it("shows a truthful delivery failure instead of substituting private or sample content", () => {
    const { container } = render(
      <PublicMediaPlayer media={media} title={record.title} />,
    );
    fireEvent.error(screen.getByLabelText(`Published video: ${record.title}`));
    expect(screen.getByRole("status").textContent).toContain(
      "Published media is unavailable",
    );
    expect(container.querySelector("img,video,source")).toBeNull();
  });

  it("adds media only to the approved public record and keeps unknown private fields absent", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue({
          ok: true,
          status: 200,
          json: async () => ({
            ...record,
            media: { ...media, originalObjectKey: "PRIVATE_KEY_SENTINEL" },
            captureLocation: { latitude: 5.123456789 },
            privateText: "PRIVATE_TEXT_SENTINEL",
          }),
        }),
    );
    const { container } = render(await ReportDetailsPage({ reportId: id }));
    expect(
      screen.getByRole("heading", { name: "Published evidence" }),
    ).toBeTruthy();
    expect(
      screen.getByLabelText(`Published video: ${record.title}`),
    ).toBeTruthy();
    expect(container.innerHTML).not.toMatch(
      /PRIVATE_KEY_SENTINEL|PRIVATE_TEXT_SENTINEL|5\.123456789/,
    );
    expect(screen.queryByText(/Text record\. No public image/)).toBeNull();
  });

  it("keeps the drawer to a published thumbnail and public record link, with no autoplay", () => {
    const { container, rerender } = render(
      <IntelligenceDrawer feature={feature} onClose={vi.fn()} />,
    );
    expect(
      screen
        .getByRole("img", { name: `Published video preview: ${record.title}` })
        .getAttribute("src"),
    ).toBe(media.thumbnailUrl);
    expect(
      screen
        .getByRole("link", { name: /Open evidence record/ })
        .getAttribute("href"),
    ).toBe(`/reports/${id}`);
    expect(container.querySelector("video")).toBeNull();
    rerender(
      <IntelligenceDrawer
        feature={{
          ...feature,
          properties: { ...feature.properties, status: undefined },
        }}
        onClose={vi.fn()}
      />,
    );
    expect(container.querySelector("img,video")).toBeNull();
  });

  it("adapts only approved observation media and strips unsafe media data before rendering", () => {
    const apiFeature: MapApiFeature = {
      type: "Feature",
      id,
      geometry: record.publicLocation,
      properties: {
        featureType: "approved_video",
        layer: "observations",
        title: record.title,
        source: "Public API",
        status: "approved",
        media,
      },
    };
    expect(adaptMapFeature(apiFeature).properties.media).toEqual(media);
    expect(
      adaptMapFeature({
        ...apiFeature,
        properties: { ...apiFeature.properties, status: "pending" },
      }).properties.media,
    ).toBeUndefined();
    expect(
      adaptMapFeature({
        ...apiFeature,
        properties: {
          ...apiFeature.properties,
          layer: "ai",
          featureType: "ai_candidate",
        },
      }).properties.media,
    ).toBeUndefined();
    expect(
      adaptMapFeature({
        ...apiFeature,
        properties: {
          ...apiFeature.properties,
          media: { ...media, url: "https://private.invalid/original" },
        },
      }).properties.media,
    ).toBeUndefined();
  });
});
