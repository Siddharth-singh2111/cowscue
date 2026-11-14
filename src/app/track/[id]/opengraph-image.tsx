import { ImageResponse } from "next/og";
import { getPublicReport } from "@/server/services/reports";
import type { PublicReport } from "@/types";

export const alt = "Live cattle rescue on Cowscue";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const SEVERITY: Record<PublicReport["severity"], { label: string; color: string; bg: string }> = {
  CRITICAL: { label: "Critical", color: "#c2272d", bg: "#fde8e8" },
  MODERATE: { label: "Moderate", color: "#b26a00", bg: "#fdf1dc" },
  ROUTINE: { label: "Routine", color: "#1f5fbf", bg: "#e3edfb" },
};

const STATUS: Record<PublicReport["status"], string> = {
  pending: "Finding the nearest rescue team",
  assigned: "A rescue team has accepted",
  en_route: "Ambulance on the way",
  resolved: "Rescued and in care",
  closed: "Case closed",
};

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let report: PublicReport | null = null;
  try {
    report = await getPublicReport(id);
  } catch {
    report = null;
  }

  const sev = report ? SEVERITY[report.severity] : null;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "linear-gradient(135deg, #fdf8f1 0%, #fbe7d3 100%)",
          color: "#2a211b",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 18,
              background: "linear-gradient(135deg,#f29a3c,#d9531e)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: 36,
            }}
          >
            ♥
          </div>
          <div style={{ fontSize: 36, fontWeight: 700 }}>Cowscue</div>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10, fontSize: 24, color: "#6b5d52" }}>
            <div style={{ width: 14, height: 14, borderRadius: 999, background: "#e5484d" }} />
            Live rescue
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {report && sev ? (
            <>
              <div style={{ display: "flex", gap: 16 }}>
                <div style={{ display: "flex", padding: "8px 22px", borderRadius: 999, background: sev.bg, color: sev.color, fontSize: 28, fontWeight: 600 }}>
                  {sev.label}
                </div>
                <div style={{ display: "flex", padding: "8px 22px", borderRadius: 999, background: "white", color: "#4a3f37", fontSize: 28 }}>
                  {STATUS[report.status]}
                </div>
              </div>
              <div style={{ fontSize: 72, fontWeight: 700, lineHeight: 1.05, maxWidth: 1000 }}>
                {report.injuryType.length > 60 ? `${report.injuryType.slice(0, 57)}…` : report.injuryType}
              </div>
            </>
          ) : (
            <div style={{ fontSize: 72, fontWeight: 700, lineHeight: 1.05 }}>Real-time rescue for injured stray cattle</div>
          )}
          <div style={{ fontSize: 32, color: "#6b5d52" }}>Help this animal — track the rescue live on Cowscue</div>
        </div>
      </div>
    ),
    size
  );
}
