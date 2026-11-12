import { Icon, LinkButton, SectionLabel } from "@/components/ui";

export function NotFoundPage() {
  return (
    <section className="page-shell">
      <div className="mx-auto max-w-2xl py-12 sm:py-20">
        <SectionLabel>404 / XERSXES Ghana</SectionLabel>
        <h1 className="page-heading mt-5">This page is unavailable.</h1>
        <p className="page-intro mt-5">
          The link may be incorrect, or this record may not be public. Private
          submissions are not accessible from public record links.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <LinkButton href="/map">
            Explore Ghana
            <Icon name="arrow-right" className="h-4 w-4" />
          </LinkButton>
          <LinkButton href="/evidence" variant="secondary">
            Reviewed observations
          </LinkButton>
        </div>
      </div>
    </section>
  );
}
