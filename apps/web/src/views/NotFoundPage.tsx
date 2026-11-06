import { PublicLayout } from "@/components/layout/PublicLayout";
import { AppLink } from "@/utils/navigation";

export function NotFoundPage() {
  return (
    <PublicLayout>
      <section className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6 lg:px-8">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-forest-600">Not found</p>
        <h1 className="mt-4 font-serif text-4xl font-medium">This page is not available</h1>
        <p className="mt-4 text-muted">The requested route does not exist in the current frontend.</p>
        <AppLink
          href="/"
          className="mt-8 inline-flex rounded-xl bg-forest-600 px-5 py-3 text-sm font-bold text-white hover:bg-forest-800"
        >
          Return home
        </AppLink>
      </section>
    </PublicLayout>
  );
}
