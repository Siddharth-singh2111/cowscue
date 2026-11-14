"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/brand/Logo";

const HIDDEN_ON = ["/dashboard", "/driver", "/report"];

export function SiteFooter() {
  const pathname = usePathname();
  if (HIDDEN_ON.some((p) => pathname.startsWith(p))) return null;

  return (
    <footer className="border-t bg-subtle pb-28 md:pb-0">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
        <div className="space-y-4">
          <Logo />
          <p className="max-w-xs text-sm text-muted-foreground">
            Real-time rescue dispatch for injured stray cattle — connecting citizens, gaushalas and NGOs across India.
          </p>
          <p className="text-xs text-muted-foreground">
            In immediate danger to people? Call <span className="font-medium text-foreground">112</span>.
          </p>
        </div>
        <FooterCol
          title="Citizens"
          links={[
            ["/report", "Report a rescue"],
            ["/my-reports", "My reports"],
            ["/leaderboard", "Leaderboard"],
          ]}
        />
        <FooterCol
          title="Partners"
          links={[
            ["/apply", "Become a partner NGO"],
            ["/dashboard", "Command center"],
            ["/impact#partners", "Partner directory"],
          ]}
        />
        <FooterCol
          title="Platform"
          links={[
            ["/impact", "Live impact"],
            ["/api/ready", "System status"],
          ]}
        />
      </div>
      <div className="border-t">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:justify-between sm:px-6">
          <p>© {new Date().getFullYear()} Cowscue. Built to give a voice to the voiceless.</p>
          <p>Map data © OpenStreetMap contributors</p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <p className="mb-3 text-sm font-medium">{title}</p>
      <ul className="space-y-2 text-sm text-muted-foreground">
        {links.map(([href, label]) => (
          <li key={href}>
            <Link href={href} className="transition-colors hover:text-foreground">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
