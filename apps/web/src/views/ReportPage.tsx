import { ReportSubmissionForm } from "@/components/forms/ReportSubmissionForm";
import { SectionLabel } from "@/components/ui";

export function ReportPage() {
  return (
    <section
      className="mx-auto max-w-3xl px-4 pb-16 pt-9 sm:px-6 sm:pb-24 sm:pt-14"
      aria-labelledby="contribution-title"
    >
      <header className="mb-7 sm:mb-10">
        <SectionLabel>Citizen contribution</SectionLabel>
        <h1
          id="contribution-title"
          className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl"
        >
          Contribute an observation
        </h1>
        <p className="mt-4 max-w-xl text-sm leading-7 text-muted">
          Share evidence of environmental change in Ghana. Your contribution
          enters a private review process before any publication decision.
        </p>
      </header>
      <ReportSubmissionForm />
    </section>
  );
}
