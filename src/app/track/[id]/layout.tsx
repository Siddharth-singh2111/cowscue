import { Suspense } from "react";
import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return {
    title: "Live rescue tracker",
    description: "Follow this cattle rescue live — ambulance location, status updates and the recovery fund.",
    openGraph: { title: "Live rescue tracker · Cowscue", url: `/track/${id}` },
    robots: { index: false },
  };
}

export default function TrackLayout({ children }: { children: React.ReactNode }) {
  return <Suspense>{children}</Suspense>;
}
