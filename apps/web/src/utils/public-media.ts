import type { PublicMedia } from "@/types/api";

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Allowlist before crossing an SSR/client boundary or assigning any media URL. */
export function safePublicMedia(value: unknown): PublicMedia | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return;
  const media = value as Record<string, unknown>;
  if (typeof media.id !== "string" || !uuid.test(media.id)) return;
  if (
    (media.mediaKind !== "image" && media.mediaKind !== "video") ||
    media.mimeType !==
      (media.mediaKind === "video" ? "video/mp4" : "image/jpeg") ||
    media.url !== `/api/v1/public-media/${media.id}/asset` ||
    media.thumbnailUrl !== `/api/v1/public-media/${media.id}/thumbnail`
  )
    return;
  // Build a fresh, explicit DTO. Unknown private fields must not be serialized
  // into a client component's props even if JSX would never display them.
  const safe: PublicMedia = {
    id: media.id,
    mediaKind: media.mediaKind,
    mimeType: media.mimeType as PublicMedia["mimeType"],
    url: media.url as string,
    thumbnailUrl: media.thumbnailUrl as string,
  };
  if (
    typeof media.width === "number" &&
    Number.isInteger(media.width) &&
    media.width > 0
  )
    safe.width = media.width;
  if (
    typeof media.height === "number" &&
    Number.isInteger(media.height) &&
    media.height > 0
  )
    safe.height = media.height;
  if (
    typeof media.durationSeconds === "number" &&
    Number.isFinite(media.durationSeconds) &&
    media.durationSeconds > 0 &&
    media.durationSeconds <= 120
  )
    safe.durationSeconds = media.durationSeconds;
  if (
    typeof media.publishedAt === "string" &&
    Number.isFinite(Date.parse(media.publishedAt))
  )
    safe.publishedAt = media.publishedAt;
  return safe;
}
