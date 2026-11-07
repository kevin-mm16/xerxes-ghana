"use client";

import { useMemo, useState } from "react";
import type { MediaType, ReportStatus, SeverityLevel } from "@/types";
import { ReportCard } from "@/components/reports/ReportCard";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { ghanaRegions, mockReports } from "@/data/mockReports";

export function EvidenceFeedPage() {
  const [region, setRegion] = useState("All");
  const [severity, setSeverity] = useState<SeverityLevel | "All">("All");
  const [status, setStatus] = useState<ReportStatus | "All">("All");
  const [mediaType, setMediaType] = useState<MediaType | "All">("All");
  const [date, setDate] = useState("All");

  const reports = useMemo(() => {
    return mockReports.filter((report) => {
      const dateMatches = date === "All" || report.dateSubmitted >= date;
      return (
        (region === "All" || report.region === region) &&
        (severity === "All" || report.severity === severity) &&
        (status === "All" || report.status === status) &&
        (mediaType === "All" || report.mediaType === mediaType) &&
        dateMatches
      );
    });
  }, [date, mediaType, region, severity, status]);

  return (
    <>
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <SectionHeader
          eyebrow="Evidence feed"
          title="Sanitized civic evidence feed"
          description="A chronological view of public report summaries and sanitized evidence previews. This is not a social feed and has no likes, comments, or sharing patterns."
        />

        <div className="mb-6 grid gap-3 rounded-2xl border border-line bg-white p-4 shadow-card md:grid-cols-5">
          <select value={region} onChange={(event) => setRegion(event.target.value)} className="h-11 rounded-xl border border-line px-3 text-sm">
            <option value="All">All regions</option>
            {ghanaRegions.map((item) => (
              <option key={item.name} value={item.name}>{item.name}</option>
            ))}
          </select>
          <select value={severity} onChange={(event) => setSeverity(event.target.value as SeverityLevel | "All")} className="h-11 rounded-xl border border-line px-3 text-sm">
            {["All", "Low", "Medium", "High", "Critical"].map((item) => (
              <option key={item} value={item}>{item === "All" ? "All severities" : item}</option>
            ))}
          </select>
          <select value={status} onChange={(event) => setStatus(event.target.value as ReportStatus | "All")} className="h-11 rounded-xl border border-line px-3 text-sm">
            {["All", "Pending", "Under Review", "Verified", "Rejected", "Escalated"].map((item) => (
              <option key={item} value={item}>{item === "All" ? "All statuses" : item}</option>
            ))}
          </select>
          <select value={mediaType} onChange={(event) => setMediaType(event.target.value as MediaType | "All")} className="h-11 rounded-xl border border-line px-3 text-sm">
            {["All", "Image", "Video", "Satellite", "Mixed"].map((item) => (
              <option key={item} value={item}>{item === "All" ? "All media" : item}</option>
            ))}
          </select>
          <select value={date} onChange={(event) => setDate(event.target.value)} className="h-11 rounded-xl border border-line px-3 text-sm">
            <option value="All">Any date</option>
            <option value="2026-07-01">Since 1 Jul 2026</option>
            <option value="2026-06-25">Since 25 Jun 2026</option>
          </select>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {reports.map((report) => (
            <ReportCard key={report.id} report={report} />
          ))}
        </div>
      </section>
    </>
  );
}
