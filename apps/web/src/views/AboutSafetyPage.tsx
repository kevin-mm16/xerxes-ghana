import AppLink from "next/link";
import { Alert, Icon, LinkButton, SectionLabel } from "@/components/ui";

export function AboutSafetyPage() {
  return (
    <article className="page-shell">
      <div className="mx-auto max-w-4xl">
        <header className="max-w-2xl pb-10">
          <SectionLabel>Methodology / Ghana</SectionLabel>
          <h1 className="page-heading mt-4">
            Read the geography.
            <br />
            Understand the evidence.
          </h1>
          <p className="page-intro mt-5">
            XERSXES connects environmental observations to geography. Imagery,
            reference boundaries, monitoring areas and reviewed evidence serve
            different purposes.
          </p>
        </header>

        <section
          aria-labelledby="geography-heading"
          className="grid gap-5 border-t border-line py-8 sm:grid-cols-[110px_minmax(0,1fr)] sm:gap-8"
        >
          <SectionLabel>01 / Geography</SectionLabel>
          <div className="min-w-0">
            <h2
              id="geography-heading"
              className="text-xl font-semibold tracking-tight"
            >
              Imagery is context, not a live feed.
            </h2>
            <p className="mt-4 text-sm leading-8 text-muted">
              The map uses satellite imagery with acquisition dates that vary by
              location. A dated, lower-detail Digital Earth Africa Sentinel-2
              layer provides a fallback when the primary imagery is unavailable.
              A recent-looking image does not establish when an event occurred.
            </p>
            <p className="mt-4 text-sm leading-8 text-muted">
              District outlines come from the Ghana Statistical Service 2021
              census reference dataset. They are administrative reference, not
              verified town perimeters. Display simplification and source
              topology can produce shared-edge differences.
            </p>
            <p className="mt-4 text-sm leading-8 text-muted">
              The outside-Ghana dimming uses a separate geoBoundaries outline,
              originally sourced from Stanford and representing 2007. It guides
              visual attention; it is not a current legal boundary, a monitoring
              eligibility boundary or an analysis mask.
            </p>
            <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-xs font-medium text-forest-800">
              <a
                href="https://statsbank.statsghana.gov.gh/censusatlas/"
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-9 items-center gap-1"
              >
                GSS census reference
                <Icon name="arrow-up-right" className="h-3 w-3" />
              </a>
              <a
                href="https://github.com/wmgeolab/geoBoundaries/blob/9469f09/releaseData/gbOpen/GHA/ADM0/geoBoundaries-GHA-ADM0.geojson"
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-9 items-center gap-1"
              >
                Pinned display outline
                <Icon name="arrow-up-right" className="h-3 w-3" />
              </a>
            </div>
          </div>
        </section>

        <section
          aria-labelledby="evidence-heading"
          className="grid gap-5 border-t border-line py-8 sm:grid-cols-[110px_minmax(0,1fr)] sm:gap-8"
        >
          <SectionLabel>02 / Evidence</SectionLabel>
          <div className="min-w-0">
            <h2
              id="evidence-heading"
              className="text-xl font-semibold tracking-tight"
            >
              Private intake. Separate public records.
            </h2>
            <p className="mt-4 text-sm leading-8 text-muted">
              Observations can include private image or video uploads. Original
              files are stored privately, hashed and processed into private
              review copies. A review copy is not automatically safe for
              publication.
            </p>
            <p className="mt-4 text-sm leading-8 text-muted">
              Public records contain an approved summary and a generalized
              location. They exclude capture coordinates, original intake text
              and private media. No name, phone number or email is requested
              during contribution; that does not guarantee anonymity.
            </p>
            <Alert
              tone="amber"
              className="mt-5"
              title="Contribute only when it is safe"
            >
              Do not confront anyone or enter a dangerous area to collect
              evidence. Review your submission for identifying details before
              sending.
            </Alert>
          </div>
        </section>

        <section
          aria-labelledby="limits-heading"
          className="grid gap-5 border-y border-line py-8 sm:grid-cols-[110px_minmax(0,1fr)] sm:gap-8"
        >
          <SectionLabel>03 / Limits</SectionLabel>
          <div className="min-w-0">
            <h2
              id="limits-heading"
              className="text-xl font-semibold tracking-tight"
            >
              A working foundation, with clear boundaries.
            </h2>
            <p className="mt-4 text-sm leading-8 text-muted">
              Monitoring areas currently use demonstration coverage geometry.
              GPS checks account for reported accuracy; a location near an edge
              can remain uncertain. Reference boundaries and monitoring
              eligibility are separate layers.
            </p>
            <p className="mt-4 text-sm leading-8 text-muted">
              The operations console uses synthetic reports and local decisions.
              Authenticated moderation, live private-media review, public media
              publication, AI analysis and authority notifications are not
              connected. No automated layer should be read as a verified
              environmental finding.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-4">
              <LinkButton href="/map" variant="secondary">
                Explore Ghana
                <Icon name="arrow-right" className="h-4 w-4" />
              </LinkButton>
              <AppLink
                href="/evidence"
                className="inline-flex min-h-10 items-center text-xs font-medium text-forest-800"
              >
                Read public observations
              </AppLink>
            </div>
          </div>
        </section>
      </div>
    </article>
  );
}
