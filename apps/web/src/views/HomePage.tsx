import AppLink from "next/link";
import { MapExplorer } from "@/components/map/MapExplorer";

export function HomePage() {
  return (
    <>
      <section className="bg-forest-900 text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 sm:px-6 lg:flex-row lg:items-end lg:justify-between lg:px-8">
          <div className="max-w-3xl">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-200">XERSXES Ghana</p>
            <h1 className="mt-3 font-serif text-4xl font-medium leading-tight tracking-tight sm:text-5xl">
              Environmental intelligence, mapped.
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-emerald-50">
              Explore reviewed observations, monitoring areas, and future satellite and AI signals across Ghana.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <AppLink href="/map" className="rounded-xl bg-white px-5 py-3 text-sm font-bold text-forest-900">
              Explore Ghana
            </AppLink>
            <AppLink href="/report" className="rounded-xl bg-alert px-5 py-3 text-sm font-bold text-white">
              Contribute evidence
            </AppLink>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1500px] px-3 py-4 sm:px-5 lg:px-6">
        <MapExplorer variant="preview" />
      </section>

      <section className="mx-auto grid max-w-7xl gap-4 px-4 pb-12 pt-4 sm:px-6 md:grid-cols-3 lg:px-8">
        {[
          ["Coverage", "Defined monitoring areas become the organizing unit for satellite, citizen, and future drone evidence."],
          ["Evidence", "Approved public observations stay geographically useful without exposing the contributor's exact capture point."],
          ["Intelligence", "AI and satellite outputs plug into the same map contract and remain review signals rather than automatic accusations."],
        ].map(([title, body]) => (
          <article key={title} className="rounded-2xl border border-line bg-white p-5 shadow-card">
            <h2 className="font-bold text-ink">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-muted">{body}</p>
          </article>
        ))}
      </section>
    </>
  );
}
