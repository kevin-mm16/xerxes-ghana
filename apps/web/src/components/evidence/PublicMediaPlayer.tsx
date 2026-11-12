"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/ui";
import type { PublicMedia } from "@/types/api";
import { safePublicMedia } from "@/utils/public-media";

export function PublicMediaPlayer({
  media,
  title,
  variant = "record",
}: {
  media: PublicMedia;
  title: string;
  variant?: "record" | "preview";
}) {
  const safe = safePublicMedia(media);
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [safe?.id, safe?.url, safe?.thumbnailUrl]);
  if (!safe) return null;
  if (failed)
    return (
      <p
        role="status"
        className="border border-line bg-white/40 px-4 py-5 text-xs leading-6 text-muted"
      >
        Published {variant === "preview" ? "preview" : "media"} is unavailable.
        The public record may have changed.
      </p>
    );
  if (variant === "preview")
    return (
      <figure className="relative overflow-hidden rounded border border-line bg-graphite">
        <img
          src={safe.thumbnailUrl}
          alt={`Published ${safe.mediaKind} preview: ${title}`}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className="aspect-video w-full object-cover"
        />
        <figcaption className="absolute bottom-2 right-2 flex items-center gap-1.5 rounded-sm bg-graphite/90 px-2 py-1 text-[10px] text-white">
          <Icon
            name={safe.mediaKind === "video" ? "video" : "image"}
            className="h-3 w-3"
          />
          Published {safe.mediaKind}
        </figcaption>
      </figure>
    );
  return (
    <figure className="overflow-hidden rounded border border-line bg-graphite">
      {safe.mediaKind === "video" ? (
        <video
          controls
          playsInline
          preload="metadata"
          poster={safe.thumbnailUrl}
          aria-label={`Published video: ${title}`}
          onError={() => setFailed(true)}
          className="max-h-[560px] w-full bg-graphite"
        >
          <source src={safe.url} type={safe.mimeType} />
          Your browser cannot play this video.{" "}
          <a href={safe.url}>Open the published video</a>.
        </video>
      ) : (
        <img
          src={safe.url}
          alt={`Published evidence: ${title}`}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className="max-h-[640px] w-full object-contain"
        />
      )}
      <figcaption className="border-t border-white/10 px-4 py-2.5 text-[10px] leading-5 text-white/70">
        Published evidence · Approved for public viewing.
      </figcaption>
    </figure>
  );
}
