import AppLink from "next/link";
import { Badge, Icon, LinkButton } from "@/components/ui";

export function ModeratorLoginForm() {
  return (
    <main className="min-h-screen bg-[#172021] px-5 py-7 font-sans text-[#f5f3ed] sm:px-8 sm:py-10">
      <header className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-5">
        <AppLink
          href="/"
          className="text-[17px] font-semibold tracking-[0.12em]"
        >
          XERSXES{" "}
          <span className="ml-2 text-[10px] font-normal tracking-[0.1em] text-[#a6b1a8]">
            / GHANA
          </span>
        </AppLink>
        <AppLink
          href="/map"
          className="flex min-h-10 items-center gap-2 text-xs text-[#c4cdc5] hover:text-white"
        >
          <Icon name="arrow-left" className="h-4 w-4" />
          Public workspace
        </AppLink>
      </header>
      <div className="mx-auto grid max-w-5xl gap-12 py-16 sm:py-24 lg:grid-cols-[1fr_0.9fr] lg:items-center lg:gap-20">
        <section>
          <p className="text-[10px] uppercase tracking-[0.16em] text-[#a6b1a8]">
            XERSXES Operations
          </p>
          <h1 className="mt-5 max-w-md text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
            A workspace for evidence review.
          </h1>
          <p className="mt-6 max-w-md text-sm leading-7 text-[#aebbb0]">
            Inspect a synthetic observation queue and try the review workflow.
            This preview is separate from live evidence intake.
          </p>
          <div className="mt-8 flex items-start gap-3 border-t border-white/10 pt-6">
            <Icon
              name="shield"
              className="mt-0.5 h-4 w-4 shrink-0 text-[#a6b1a8]"
            />
            <p className="max-w-sm text-xs leading-6 text-[#aebbb0]">
              Production review requires authenticated, authorized access. That
              connection is not available in this preview.
            </p>
          </div>
        </section>
        <section
          aria-labelledby="demo-access-heading"
          className="rounded-[6px] border border-[#d9ddd6] bg-[#f5f3ed] p-6 text-[#172021] sm:p-8"
        >
          <Badge tone="amber">DEMO ACCESS</Badge>
          <h2
            id="demo-access-heading"
            className="mt-5 text-xl font-semibold tracking-tight"
          >
            Open the review preview
          </h2>
          <p className="mt-3 text-sm leading-6 text-[#65706a]">
            No sign-in is performed. No credentials are requested.
          </p>
          <dl className="mt-6 divide-y divide-[#d9ddd6] border-y border-[#d9ddd6] text-xs">
            <div className="flex justify-between gap-4 py-3">
              <dt className="text-[#65706a]">Records</dt>
              <dd className="text-right font-medium">Synthetic samples</dd>
            </div>
            <div className="flex justify-between gap-4 py-3">
              <dt className="text-[#65706a]">Private media</dt>
              <dd className="text-right font-medium">Not connected</dd>
            </div>
            <div className="flex justify-between gap-4 py-3">
              <dt className="text-[#65706a]">Decisions</dt>
              <dd className="text-right font-medium">Local session only</dd>
            </div>
          </dl>
          <LinkButton
            href="/moderator/dashboard"
            className="mt-7 w-full justify-between"
          >
            Open demo console <Icon name="arrow-right" className="h-4 w-4" />
          </LinkButton>
          <p className="mt-4 text-[11px] leading-5 text-[#65706a]">
            Demo changes reset on reload. No live submission can be approved or
            published here.
          </p>
        </section>
      </div>
    </main>
  );
}
