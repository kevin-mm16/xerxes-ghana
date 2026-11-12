import AppLink from "next/link";

const links = [
  "Review queue",
  "Evidence review",
  "Hotspots",
  "Escalations",
  "Audit trail",
  "Settings",
];

export function ModeratorSidebar() {
  return (
    <aside className="admin-grid border-r border-white/10 bg-forest-900 text-white lg:min-h-screen">
      <div className="sticky top-0 p-5">
        <AppLink href="/" className="block rounded-xl border border-white/10 bg-white/5 p-4">
          <span className="block text-sm font-bold">Ghana Galamsey Watch</span>
          <span className="mt-1 block text-xs uppercase tracking-[0.16em] text-emerald-100/70">
            Moderator area
          </span>
        </AppLink>
        <nav className="mt-6 flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
          {links.map((link, index) => (
            <a
              key={link}
              href={index === 0 ? "#review-queue" : "#"}
              className="whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold text-emerald-50/80 hover:bg-white/10 hover:text-white"
            >
              {link}
            </a>
          ))}
        </nav>
        <div className="mt-8 rounded-xl border border-amber-300/40 bg-amber-100/10 p-4 text-xs leading-5 text-amber-50">
          Authorized moderators only. Authentication and permissions are not connected yet.
        </div>
      </div>
    </aside>
  );
}
