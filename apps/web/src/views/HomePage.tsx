import { PublicLayout } from "@/components/layout/PublicLayout";
import { CoordinateMapPreview } from "@/components/map/CoordinateMapPreview";
import { SafetyNotice } from "@/components/ui/SafetyNotice";
import { StatCard } from "@/components/ui/StatCard";
import { dashboardStats } from "@/data/mockDashboard";
import { getReportById } from "@/data/mockReports";
import { AppLink } from "@/utils/navigation";

const steps = [
  {
    title: "Submit safely",
    body: "Citizens can submit a report without creating an account and without providing name, phone, or email.",
  },
  {
    title: "Private review",
    body: "Moderators review sensitive details, exact location, and raw media before anything appears publicly.",
  },
  {
    title: "Verified public map",
    body: "Public pins use approximate locations and clear verification status, avoiding false certainty.",
  },
  {
    title: "Evidence-based monitoring",
    body: "Reports, sanitized media, and future satellite analysis help track landscape damage over time.",
  },
];

export function HomePage() {
  const featuredReport = getReportById("rpt-002");

  return (
    <PublicLayout>
      <section className="relative overflow-hidden bg-gradient-to-br from-forest-800 via-forest-600 to-forest-900 text-white">
        <div className="hero-grid absolute inset-0 opacity-80" />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:px-8 lg:py-24">
          <div>
            <p className="inline-flex rounded-full border border-white/20 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-emerald-100">
              Security-first civic monitoring
            </p>
            <h1 className="mt-6 font-serif text-5xl font-medium leading-[1.02] tracking-tight md:text-6xl">
              Ghana Galamsey Watch
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-emerald-50">
              A security-first frontend for safe reporting, private verification, and map-based monitoring of suspected galamsey
              activity affecting Ghana's rivers, forests, farms, and communities.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <AppLink
                href="/report"
                className="rounded-xl bg-alert px-5 py-3 text-sm font-bold text-white shadow-lg hover:bg-red-800"
              >
                Submit a Report
              </AppLink>
              <AppLink
                href="/map"
                className="rounded-xl border border-white/30 bg-white/10 px-5 py-3 text-sm font-bold text-white hover:bg-white/20"
              >
                View Map
              </AppLink>
              <AppLink
                href="/evidence"
                className="rounded-xl bg-white px-5 py-3 text-sm font-bold text-forest-800 hover:bg-emerald-50"
              >
                Explore Evidence
              </AppLink>
            </div>
            <p className="mt-6 max-w-xl text-sm leading-6 text-emerald-100">
              Anonymous reports do not require your identity. Public pages show generalized information only.
            </p>
          </div>

          <div className="relative">
            {featuredReport ? (
              <CoordinateMapPreview
                coordinates={featuredReport.publicCoordinatesApproximate}
                label={featuredReport.approximateLocationLabel}
                severity={featuredReport.severity}
                zoom={8}
                heightClass="aspect-[4/3] h-auto"
                title="Featured public coordinate"
                showAttribution
              />
            ) : null}
            <div className="absolute -bottom-5 right-4 grid grid-cols-2 gap-3 rounded-2xl bg-white p-4 text-ink shadow-lift">
              <div>
                <p className="font-serif text-3xl font-semibold text-alert">2</p>
                <p className="text-xs text-muted">critical alerts</p>
              </div>
              <div>
                <p className="font-serif text-3xl font-semibold text-forest-800">3</p>
                <p className="text-xs text-muted">verified hotspots</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {dashboardStats.slice(0, 4).map((stat) => (
            <StatCard key={stat.label} label={stat.label} value={stat.value} detail={stat.detail} tone={stat.tone} />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-14 sm:px-6 lg:px-8">
        <div className="mb-8 max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-forest-600">How it works</p>
          <h2 className="mt-3 font-serif text-4xl font-medium leading-tight">From safe report to public insight</h2>
        </div>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {steps.map((step, index) => (
            <article key={step.title} className="rounded-2xl border border-line bg-white p-6 shadow-card">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-forest-50 font-serif text-lg font-bold text-forest-800">
                {index + 1}
              </span>
              <h3 className="mt-5 text-lg font-bold">{step.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted">{step.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <SafetyNotice title="Trust and safety" tone="privacy">
          This frontend currently uses sample data while backend services are prepared. It keeps privacy-conscious
          public/private separation, status badges, approximate map locations, and moderator-only handling of sensitive
          data at the center of the interface.
        </SafetyNotice>
      </section>
    </PublicLayout>
  );
}
