import { ReportDetailsPage } from "@/views/ReportDetailsPage";

export default async function Page({ params }: { params: Promise<{ reportId: string }> }) {
  const { reportId } = await params;
  return <ReportDetailsPage reportId={reportId} />;
}
