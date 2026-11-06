import { AppLink } from "@/utils/navigation";

export function Footer() {
  return (
    <footer className="border-t border-line bg-white">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 text-sm text-muted sm:px-6 md:grid-cols-[1.4fr_1fr_1fr] lg:px-8">
        <div>
          <p className="font-bold text-ink">Ghana Galamsey Watch</p>
          <p className="mt-2 max-w-xl leading-6">
            Frontend for safe, anonymous civic reporting and evidence-based monitoring of suspected galamsey activity
            in Ghana. Report collection is not connected yet.
          </p>
        </div>
        <div>
          <p className="font-semibold text-ink">Public pages</p>
          <div className="mt-2 flex flex-col gap-1">
            <AppLink href="/map">Map</AppLink>
            <AppLink href="/report">Submit a Report</AppLink>
            <AppLink href="/evidence">Evidence Feed</AppLink>
            <AppLink href="/about">About and Safety</AppLink>
          </div>
        </div>
        <div>
          <p className="font-semibold text-ink">Moderator access</p>
          <p className="mt-2 leading-6">
            Mocked private routes exist at{" "}
            <AppLink className="font-semibold text-forest-800" href="/moderator/login">
              /moderator/login
            </AppLink>
            .
          </p>
        </div>
      </div>
    </footer>
  );
}
