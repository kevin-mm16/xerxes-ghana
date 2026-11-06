import { PublicLayout } from "@/components/layout/PublicLayout";
import { ReportDetails } from "@/components/reports/ReportDetails";
import type { VerificationEvent } from "@/types";
import { getRelatedReports, getReportById, mockVerificationEvents } from "@/data/mockReports";
import { NotFoundPage } from "@/pages/NotFoundPage";

interface ReportDetailsPageProps {
  reportId: string;
}

function fallbackEvents(reportId: string): VerificationEvent[] {
  return [
    {
      id: `${reportId}-submitted`,
      reportId,
      label: "Report submitted",
      detail: "Anonymous report received in the review queue.",
      date: "2026-07-01",
      status: "complete",
    },
    {
      id: `${reportId}-media`,
      reportId,
      label: "Media received privately",
      detail: "Raw media is intended for private review only.",
      date: "2026-07-01",
      status: "complete",
    },
    {
      id: `${reportId}-review`,
      reportId,
      label: "Moderator review started",
      detail: "Sensitive details are checked before public display.",
      date: "2026-07-02",
      status: "current",
    },
    {
      id: `${reportId}-satellite`,
      reportId,
      label: "Satellite comparison pending",
      detail: "Future workflow will connect to Google Earth Engine.",
      date: "2026-07-02",
      status: "pending",
    },
  ];
}

export function ReportDetailsPage({ reportId }: ReportDetailsPageProps) {
  const report = getReportById(reportId);

  if (!report) {
    return <NotFoundPage />;
  }

  const events = mockVerificationEvents.filter((event) => event.reportId === report.id);

  return (
    <PublicLayout>
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <ReportDetails
          report={report}
          relatedReports={getRelatedReports(report)}
          events={events.length > 0 ? events : fallbackEvents(report.id)}
        />
      </section>
    </PublicLayout>
  );
}
