import { AppLink, usePathname } from "@/utils/navigation";
import { cn } from "@/utils/cn";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/map", label: "Map" },
  { href: "/report", label: "Report" },
  { href: "/evidence", label: "Evidence Feed" },
  { href: "/about", label: "About" },
];

export function PublicNavbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-white/95 backdrop-blur">
      <nav className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:px-8">
        <AppLink href="/" className="flex items-center gap-3">
          <span className="relative h-8 w-8 rounded-full rounded-bl-sm bg-gradient-to-br from-emerald-600 to-forest-800">
            <span className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white" />
          </span>
          <span className="leading-tight">
            <span className="block text-sm font-bold text-ink">Ghana Galamsey Watch</span>
            <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-faint">
              Public monitoring platform
            </span>
          </span>
        </AppLink>

        <div className="flex flex-wrap items-center gap-2 lg:ml-auto">
          {navItems.map((item) => {
            const active = item.href === "/" ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <AppLink
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm font-semibold transition",
                  active ? "bg-forest-50 text-forest-800" : "text-muted hover:bg-paper hover:text-forest-800",
                )}
              >
                {item.label}
              </AppLink>
            );
          })}
          <AppLink
            href="/report"
            className="inline-flex items-center gap-2 rounded-lg bg-alert px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-red-800"
          >
            <span className="h-2 w-2 rounded-full bg-white" />
            Report Activity
          </AppLink>
        </div>
      </nav>
    </header>
  );
}
