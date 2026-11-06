import { PublicLayout } from "@/components/layout/PublicLayout";
import { MapExplorer } from "@/components/map/MapExplorer";
import { SectionHeader } from "@/components/ui/SectionHeader";

export function MapPage() {
  return (
    <PublicLayout>
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="Ghana hotspot map"
          title="Approximate public monitoring map"
          description="Filter suspected galamsey reports by region, severity, status, media type, and date. Public pins are generalized and do not expose exact GPS coordinates."
        />
        <MapExplorer />
      </section>
    </PublicLayout>
  );
}
