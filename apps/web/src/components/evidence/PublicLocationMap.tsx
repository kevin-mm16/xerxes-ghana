"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui";
import type { PublicObservation } from "@/types/api";

export interface PublicLocationMapProps {
  geometry: PublicObservation["publicLocation"];
  label: string;
}

const PublicLocationMapCanvas = dynamic(
  () =>
    import("./PublicLocationMapCanvas").then(
      (module) => module.PublicLocationMapCanvas,
    ),
  {
    ssr: false,
    loading: () => (
      <div role="status" className="record-location-map bg-[#e8ece3] p-6">
        <Skeleton className="h-full" />
        <span className="sr-only">Loading public location map...</span>
      </div>
    ),
  },
);

export function PublicLocationMap(props: PublicLocationMapProps) {
  return <PublicLocationMapCanvas {...props} />;
}
