"use client";

import AppLink from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/utils/cn";

const navItems = [
  { href: "/map", label: "Explore" },
  { href: "/about", label: "Methodology" },
];

export function PublicNavbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-[800] border-b border-line bg-white/95 backdrop-blur">
      <nav className="mx-auto flex max-w-[1600px] items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <AppLink href="/" className="flex min-w-0 items-center gap-3">
          <span className="relative h-8 w-8 shrink-0 rounded-full rounded-bl-sm bg-gradient-to-br from-emerald-600 to-forest-800">
            <span className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white" />
          </span>
          <span className="min-w-0 leading-tight">
            <span className="block truncate text-sm font-black tracking-[0.08em] text-ink">
              XERSXES
            </span>
            <span className="hidden text-[10px] font-bold uppercase tracking-[0.16em] text-faint sm:block">
              Environmental intelligence · Ghana
            </span>
          </span>
        </AppLink>

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          {navItems.map((item) => {
            const active = pathname.startsWith(item.href);
            return (
              <AppLink
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm font-semibold transition",
                  item.href === "/about" && "hidden sm:inline-flex",
                  active
                    ? "bg-forest-50 text-forest-800"
                    : "text-muted hover:bg-paper hover:text-forest-800",
                )}
              >
                {item.label}
              </AppLink>
            );
          })}
          <AppLink
            href="/report"
            className="rounded-lg bg-alert px-3 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-red-800 sm:px-4"
          >
            Contribute
          </AppLink>
        </div>
      </nav>
    </header>
  );
}
