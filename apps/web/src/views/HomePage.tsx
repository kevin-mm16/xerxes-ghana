import { MapExplorer } from "@/components/map/MapExplorer";
import { Icon, LinkButton, SectionLabel } from "@/components/ui";

export function HomePage() {
  return (
    <>
      <section className="homepage-hero">
        <div className="max-w-[750px]">
          <SectionLabel>Observe. Understand. Protect.</SectionLabel>
          <h1 className="editorial-heading mt-5 text-[44px] sm:text-[58px] lg:text-[68px]">
            Environmental intelligence
            <br className="hidden sm:block" /> for Ghana.
          </h1>
          <p className="mt-5 max-w-[530px] text-[13px] leading-[1.9] text-muted">
            Explore satellite imagery and district references. Contribute
            observations for private review, with only approved, generalized
            locations shared publicly.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 pb-1">
          <LinkButton href="/map">
            Explore Ghana
            <Icon name="arrow-right" className="h-4 w-4" />
          </LinkButton>
          <LinkButton href="/report" variant="secondary">
            Contribute evidence
          </LinkButton>
        </div>
      </section>
      <section
        className="homepage-map"
        aria-label="Explore the Ghana satellite map"
      >
        <MapExplorer variant="preview" />
        <div className="homepage-map-caption">
          <span>Satellite basemap · Image dates vary by location.</span>
          <span>
            Boundaries provide geographic context. They do not identify mining
            activity.
          </span>
        </div>
      </section>
    </>
  );
}
