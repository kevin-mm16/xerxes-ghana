import { ReportSubmissionForm } from "@/components/forms/ReportSubmissionForm";
import { SectionHeader } from "@/components/ui/SectionHeader";

export function ReportPage() {
  return (
    <>
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="Submit a report"
          title="Contribute an observation"
          description="Check coverage, add context, and send it for private review."
        />
        <ReportSubmissionForm />
      </section>
    </>
  );
}
