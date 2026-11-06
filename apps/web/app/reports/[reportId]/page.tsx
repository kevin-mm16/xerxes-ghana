import { notFound } from "next/navigation";
import { ReportDetailsPage } from "@/ClientViews";
import { getReportById } from "@/data/mockReports";
export default async function Page({ params }: { params: Promise<{ reportId: string }> }) {
  const { reportId } = await params;
  if (!getReportById(reportId)) notFound();
  return <ReportDetailsPage reportId={reportId} />;
}
