"use client";

import Link from "next/link";
import { ArrowRight, LayoutDashboard, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMe, type Me } from "@/hooks/useMe";

export interface Workspace {
  href: string;
  label: string;
  /** Compact label for the phone-width header. */
  short: string;
  icon: typeof LayoutDashboard;
}

/** Where a signed-in responder or admin "lives" in the app. Citizens and signed-out visitors have none. */
export function workspacesFor(me: Me | undefined): Workspace[] {
  if (me?.role === "ngo") return [{ href: "/dashboard", label: "Go to dashboard", short: "Dashboard", icon: LayoutDashboard }];
  if (me?.role === "superadmin")
    return [
      { href: "/admin", label: "Admin panel", short: "Admin", icon: ShieldCheck },
      { href: "/dashboard", label: "Command center", short: "Command", icon: LayoutDashboard },
    ];
  return [];
}

export function useWorkspaces() {
  const { me } = useMe();
  return { me, workspaces: workspacesFor(me) };
}

/**
 * Welcome-back strip for NGO responders and super admins, shown at the top of the landing page so
 * the first thing they see after signing in is a way into their workspace.
 */
export function WorkspaceBanner() {
  const { me, workspaces } = useWorkspaces();
  if (!me || workspaces.length === 0) return null;

  const [primary, ...rest] = workspaces;
  const who = me.role === "ngo" ? (me.ngo?.ngoName ?? "your NGO") : "super admin";
  const blurb =
    me.role === "ngo"
      ? "New cases near you, live tracking and fundraisers are waiting in your dashboard."
      : "Review NGO applications and keep an eye on every live rescue.";

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-primary/25 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-sm font-medium">
          Signed in as <span className="text-primary">{who}</span>
        </p>
        <p className="text-sm text-muted-foreground">{blurb}</p>
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">
        <Button asChild size="sm" className="h-9 px-4">
          <Link href={primary.href}>
            <primary.icon /> {primary.label} <ArrowRight />
          </Link>
        </Button>
        {rest.map((w) => (
          <Button key={w.href} asChild size="sm" variant="outline" className="h-9 px-4">
            <Link href={w.href}>
              <w.icon /> {w.label}
            </Link>
          </Button>
        ))}
      </div>
    </div>
  );
}
