// src/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from '@clerk/nextjs'
import { Toaster } from 'sonner'
import Navbar from "@/components/Navbar"; 
import Footer from "@/components/Footer"; 
import Chatbot from "@/components/Chatbot";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Cowscue | Rescue Stray Cattle",
  description: "A platform to connect injured stray cows with nearest NGOs.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={`${inter.className} flex flex-col min-h-screen`}>
          {/* TOP NAVIGATION */}
          <Navbar />
          
          {/* MAIN PAGE CONTENT */}
          <main className="flex-grow bg-slate-50">
            {children}
          </main>

          {/* 🟢 2. THE NEW FOOTER */}
          <Footer />
          <Chatbot/>
          <Toaster richColors position="top-center" closeButton />
        </body>
      </html>
    </ClerkProvider>
  );
}