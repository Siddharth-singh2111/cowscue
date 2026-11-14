import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Live impact",
  description: "Real-time, anonymised numbers from Cowscue: rescues, response times, hotspots and partner NGOs.",
};

export default function ImpactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
