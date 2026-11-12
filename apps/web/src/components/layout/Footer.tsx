import AppLink from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-[1600px] flex-col justify-between gap-6 px-5 py-7 text-[11px] text-muted sm:px-8 md:flex-row md:items-start">
        <div>
          <p className="text-[10px] font-semibold tracking-[.15em] text-ink">
            XERSXES / GHANA
          </p>
          <p className="mt-2 max-w-[510px] leading-5">
            Do not put yourself at risk to collect evidence. No identity details
            are requested; anonymity is not guaranteed.
          </p>
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-3 md:pt-1">
          <AppLink className="hover:text-ink" href="/evidence">
            Evidence
          </AppLink>
          <AppLink className="hover:text-ink" href="/about">
            Methodology & safety
          </AppLink>
          <AppLink className="hover:text-ink" href="/moderator/login">
            Operations demo
          </AppLink>
        </div>
      </div>
    </footer>
  );
}
