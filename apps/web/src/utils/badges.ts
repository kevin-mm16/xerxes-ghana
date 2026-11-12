import type { ReportStatus, SeverityLevel } from "@/types";

export const statusLabels: Record<ReportStatus, string> = {
  Pending: "Pending review",
  "Under Review": "Under review",
  Verified: "Verified report",
  Rejected: "Rejected after review",
  Escalated: "Escalated to authority",
};

export const statusBadgeClasses: Record<ReportStatus, string> = {
  Pending: "bg-slate-100 text-slate-700 border-slate-200",
  "Under Review": "bg-amber-50 text-amber-800 border-amber-200",
  Verified: "bg-emerald-50 text-emerald-800 border-emerald-200",
  Rejected: "bg-zinc-100 text-zinc-700 border-zinc-200",
  Escalated: "bg-red-50 text-red-800 border-red-200",
};

export const severityBadgeClasses: Record<SeverityLevel, string> = {
  Low: "bg-emerald-50 text-emerald-800 border-emerald-200",
  Medium: "bg-amber-50 text-amber-800 border-amber-200",
  High: "bg-orange-50 text-orange-800 border-orange-200",
  Critical: "bg-red-50 text-red-800 border-red-200",
};

export const severityDotClasses: Record<SeverityLevel, string> = {
  Low: "bg-emerald-600",
  Medium: "bg-warning",
  High: "bg-high",
  Critical: "bg-alert",
};

export const severityPinColors: Record<SeverityLevel, string> = {
  Low: "#2f9e5b",
  Medium: "#c9922a",
  High: "#d9662a",
  Critical: "#c0342a",
};
