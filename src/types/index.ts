export type ReportStatus = "pending" | "assigned" | "resolved";
export type ReportSeverity = "critical" | "moderate" | "routine";

export interface Report {
  _id: string;
  reporterId: string;
  reporterName: string;
  reporterPhone: string;
  reporterHistory: number;
  imageUrl: string;
  description: string;
  status: ReportStatus;
  severity: ReportSeverity;
  ngoNotes?: string;
  assignedTo?: string;
  location: { coordinates: [number, number] };
  createdAt: string;
  updatedAt: string;
}

export interface UserStats {
  karmaPoints: number;
  rescuedCows: number;
  totalReported: number;
}

export interface PlatformStats {
  totalReports: number;
  resolvedReports: number;
  pendingReports: number;
  assignedReports: number;
  totalCitizenReporters: number;
  criticalCases: number;
  successRate: number;
}