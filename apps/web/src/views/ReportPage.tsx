import { ReportSubmissionForm } from "@/components/forms/ReportSubmissionForm";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { SectionHeader } from "@/components/ui/SectionHeader";

export function ReportPage() {
  return (
    <PublicLayout>
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="Submit a report"
          title="Report suspected illegal mining safely"
          description="Share only what you can safely provide. Submission storage is not connected yet, so this screen previews the frontend flow."
        />
        <ReportSubmissionForm />
      </section>
    </PublicLayout>
  );
}
