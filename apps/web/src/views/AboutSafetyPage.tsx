import { SafetyNotice } from "@/components/ui/SafetyNotice";
import { SectionHeader } from "@/components/ui/SectionHeader";

const sections = [
  {
    title: "What the platform does",
    body: "It demonstrates safe anonymous reporting, private moderation, approximate public maps, status-labelled reports, and sanitized evidence previews for suspected galamsey monitoring.",
  },
  {
    title: "What it does not do yet",
    body: "It does not collect real reports, upload media, authenticate moderators, store files, process satellite imagery, run machine learning, or notify authorities.",
  },
  {
    title: "Anonymous reporting principles",
    body: "The current frontend does not require name, phone, email, or account details. A production system still needs a full threat model and security review before launch.",
  },
  {
    title: "Verification process",
    body: "Reports should move through private review, sensitive-detail removal, duplicate checks, satellite comparison, and a documented decision before public display.",
  },
  {
    title: "Approximate locations",
    body: "Public pages show generalized places so reporters, witnesses, and nearby communities are not exposed by exact GPS coordinates.",
  },
  {
    title: "Evidence handling",
    body: "Raw media should remain private. Public evidence should be sanitized copies with metadata removed and sensitive visual details blurred where needed.",
  },
];

export function AboutSafetyPage() {
  return (
    <>
      <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="About and safety"
          title="Security-first civic monitoring for Ghana"
          description="Ghana Galamsey Watch is designed around reporter safety, careful verification, and public transparency without exposing sensitive raw data."
        />

        <div className="mb-6">
          <SafetyNotice title="Reporter safety">
            Do not put yourself in danger. Do not confront miners. Submit reports only when it is safe.
          </SafetyNotice>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {sections.map((section) => (
            <article key={section.title} className="rounded-2xl border border-line bg-white p-6 shadow-card">
              <h2 className="text-lg font-bold">{section.title}</h2>
              <p className="mt-3 text-sm leading-7 text-muted">{section.body}</p>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
