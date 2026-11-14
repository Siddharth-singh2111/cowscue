import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "sonner";
import { Providers } from "@/components/providers";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import Chatbot from "@/components/Chatbot";
import "./globals.css";

const geistSans = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });
const instrumentSerif = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--font-instrument-serif" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  title: { default: "Cowscue — Rescue dispatch for injured stray cattle", template: "%s · Cowscue" },
  description:
    "Snap a photo, drop a pin, and Cowscue's AI triage dispatches the nearest verified NGO in seconds. Track the ambulance live.",
  applicationName: "Cowscue",
  manifest: "/manifest.webmanifest",
  openGraph: { type: "website", siteName: "Cowscue", locale: "en_IN" },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fcfaf7" },
    { media: "(prefers-color-scheme: dark)", color: "#1a1714" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <ClerkProvider appearance={{ variables: { colorPrimary: "#e8742c", borderRadius: "0.75rem" } }}>
      <html lang="en" suppressHydrationWarning>
        <body className={`${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable} flex min-h-dvh flex-col font-sans`}>
          <Providers>
            <SiteHeader />
            <main className="flex-1">{children}</main>
            <SiteFooter />
            <Chatbot />
            <Toaster position="top-center" richColors closeButton toastOptions={{ className: "!rounded-2xl" }} />
          </Providers>
        </body>
      </html>
    </ClerkProvider>
  );
}
