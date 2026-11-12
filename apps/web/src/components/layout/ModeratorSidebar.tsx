import AppLink from "next/link";
import { Badge, Icon } from "@/components/ui";

const links = [
  { label: "Review queue", href: "#review-queue", icon: "list" },
  { label: "Review workspace", href: "#review-workspace", icon: "file" },
  { label: "Review checklist", href: "#review-checklist", icon: "check" },
  { label: "Session activity", href: "#session-activity", icon: "shield" },
];

export function ModeratorSidebar() {
  return (
    <aside className="min-w-0 border-b border-white/10 bg-[#172021] text-[#f5f3ed] lg:border-b-0 lg:border-r">
      <div className="flex items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:sticky lg:top-0 lg:min-h-screen lg:flex-col lg:items-stretch lg:justify-start lg:px-5 lg:py-7">
        <a
          href="#operations-main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:p-3 focus:text-[#172021]"
        >
          Skip to review console
        </a>
        <AppLink
          href="/"
          aria-label="XERSXES public homepage"
          className="block shrink-0"
        >
          <span className="block text-[17px] font-semibold tracking-[0.12em]">
            XERSXES
          </span>
          <span className="mt-1 block text-[9px] uppercase tracking-[0.12em] text-[#a6b1a8]">
            Environmental Intelligence
          </span>
          <span className="mt-4 hidden text-[10px] uppercase tracking-[0.14em] text-[#a6b1a8] lg:block">
            Ghana / Operations
          </span>
        </AppLink>
        <div className="lg:mt-5">
          <Badge tone="amber">DEMO</Badge>
        </div>
        <nav
          aria-label="Operations"
          className="mt-9 hidden flex-col gap-1 lg:flex"
        >
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="flex min-h-10 items-center gap-3 rounded-[4px] px-2 text-xs font-medium text-[#c4cdc5] hover:bg-white/[0.06] hover:text-white"
            >
              <Icon name={link.icon} className="h-4 w-4 text-[#98a69b]" />
              {link.label}
            </a>
          ))}
        </nav>
        <div className="mt-auto hidden pt-10 lg:block">
          <p className="border-t border-white/10 pt-5 text-[10px] leading-5 text-[#a6b1a8]">
            Synthetic records only.
            <br />
            Live moderation is not connected.
          </p>
          <AppLink
            href="/map"
            className="mt-5 flex min-h-10 items-center gap-2 text-xs text-[#d4dcd2] hover:text-white"
          >
            <Icon name="arrow-left" className="h-4 w-4" />
            Public workspace
          </AppLink>
        </div>
      </div>
    </aside>
  );
}
