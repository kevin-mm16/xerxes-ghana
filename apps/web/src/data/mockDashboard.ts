import type { DashboardStat } from "@/types";
import { mockReports } from "@/data/mockReports";

const count = (predicate: (status: (typeof mockReports)[number]) => boolean) =>
  mockReports.filter(predicate).length;

export const dashboardStats: DashboardStat[] = [
  {
    label: "Total reports",
    value: String(mockReports.length),
    detail: "Mock reports across monitored regions",
    tone: "neutral",
  },
  {
    label: "Pending verification",
    value: String(count((report) => report.status === "Pending" || report.status === "Under Review")),
    detail: "Need moderator triage",
    tone: "warning",
  },
  {
    label: "Verified hotspots",
    value: String(count((report) => report.status === "Verified")),
    detail: "Eligible for public map display",
    tone: "success",
  },
  {
    label: "Critical alerts",
    value: String(count((report) => report.severity === "Critical")),
    detail: "Highest priority queue",
    tone: "critical",
  },
  {
    label: "Escalated reports",
    value: String(count((report) => report.status === "Escalated")),
    detail: "Mock authority handoff",
    tone: "critical",
  },
];

export const verificationChecklist = [
  "Media reviewed",
  "Location checked",
  "Duplicate search completed",
  "Satellite comparison checked",
  "Sensitive details removed",
  "Public location generalized",
  "Escalation decision recorded",
];

export const auditTrail = [
  "Report submitted",
  "Assigned to moderator",
  "Status changed to Under Review",
  "Media sanitized for public preview",
  "Private coordinates marked restricted",
  "Escalation decision recorded",
];
