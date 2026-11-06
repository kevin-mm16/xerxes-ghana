export type ReportStatus =
  | "Pending"
  | "Under Review"
  | "Verified"
  | "Rejected"
  | "Escalated";

export type SeverityLevel = "Low" | "Medium" | "High" | "Critical";

export type MediaType = "Image" | "Video" | "Satellite" | "Mixed";

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Report {
  id: string;
  title: string;
  description: string;
  region: string;
  district: string;
  approximateLocationLabel: string;
  exactCoordinatesPrivate?: Coordinates;
  publicCoordinatesApproximate: Coordinates;
  severity: SeverityLevel;
  status: ReportStatus;
  mediaType: MediaType;
  mediaUrl?: string;
  thumbnailUrl?: string;
  dateObserved: string;
  dateSubmitted: string;
  anonymous: boolean;
  verificationSource: string;
  affectedRiverOrWaterBody?: string;
  evidenceConfidenceScore?: number;
  assignedModerator?: string;
  corroboratingReports: number;
}

export interface Hotspot {
  id: string;
  reportId: string;
  label: string;
  region: string;
  district: string;
  severity: SeverityLevel;
  status: ReportStatus;
  xPercent: number;
  yPercent: number;
  publicCoordinatesApproximate: Coordinates;
}

export interface VerificationEvent {
  id: string;
  reportId: string;
  label: string;
  detail: string;
  date: string;
  status: "complete" | "current" | "pending";
}

export interface MediaItem {
  id: string;
  reportId: string;
  title: string;
  mediaType: MediaType;
  sanitized: boolean;
  publicNote: string;
}

export interface DashboardStat {
  label: string;
  value: string;
  detail: string;
  tone: "neutral" | "warning" | "success" | "critical";
}

export interface GhanaRegion {
  name: string;
  capital: string;
}
