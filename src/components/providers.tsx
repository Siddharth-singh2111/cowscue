"use client";

import { ThemeProvider } from "next-themes";
import { SWRConfig } from "swr";
import { TooltipProvider } from "@/components/ui/tooltip";
import { fetcher } from "@/lib/api";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <SWRConfig value={{ fetcher, revalidateOnFocus: true, dedupingInterval: 4000, errorRetryCount: 2 }}>
        <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
      </SWRConfig>
    </ThemeProvider>
  );
}
