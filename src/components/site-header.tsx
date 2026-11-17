"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignInButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import { Activity, BarChart3, HandHeart, Home, LayoutDashboard, ListChecks, Plus, ShieldCheck, Trophy } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { useMe } from "@/hooks/useMe";
import { useWorkspaces } from "@/components/workspace";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; icon: typeof Home };

function useNav(): { links: NavItem[]; showReport: boolean } {
  const { me } = useMe();
  const role = me?.role;
  const links: NavItem[] = [
    { href: "/impact", label: "Live impact", icon: BarChart3 },
    { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
  ];
  if (role === "ngo") links.unshift({ href: "/dashboard", label: "Command center", icon: LayoutDashboard });
  else if (role === "superadmin") {
    links.unshift({ href: "/admin", label: "Admin", icon: ShieldCheck });
    links.splice(1, 0, { href: "/dashboard", label: "Command center", icon: LayoutDashboard });
  } else {
    if (role === "citizen") links.push({ href: "/my-reports", label: "My reports", icon: ListChecks });
    links.push({ href: "/apply", label: "For NGOs", icon: HandHeart });
  }
  return { links, showReport: role !== "ngo" && role !== "superadmin" };
}

const HIDDEN_ON = ["/driver"];

export function SiteHeader() {
  const pathname = usePathname();
  const { links, showReport } = useNav();
  const { workspaces } = useWorkspaces();
  // The header's primary button jumps to the user's workspace — or the other one, if they're already there.
  const workspace = workspaces.find((w) => !pathname.startsWith(w.href));
  if (HIDDEN_ON.some((p) => pathname.startsWith(p))) return null;

  return (
    <>
      <header className="sticky top-0 z-[900] border-b border-border/70 bg-background/75 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6">
          <Link href="/" className="shrink-0 rounded-lg" aria-label="Cowscue home">
            <Logo />
          </Link>

          <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
            {links.map((l) => {
              const active = pathname === l.href || pathname.startsWith(`${l.href}/`);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground",
                    active && "bg-accent text-foreground"
                  )}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            {showReport && (
              <Button asChild size="sm" className="hidden h-9 px-4 sm:inline-flex">
                <Link href="/report">
                  <Plus /> Report a rescue
                </Link>
              </Button>
            )}
            {workspace && (
              <Button asChild size="sm" className="h-9 px-3 sm:px-4">
                <Link href={workspace.href}>
                  <workspace.icon />
                  <span className="sm:hidden">{workspace.short}</span>
                  <span className="hidden sm:inline">{workspace.label}</span>
                </Link>
              </Button>
            )}
            <SignedOut>
              <SignInButton mode="modal">
                <Button variant="outline" size="sm" className="h-9 px-4">
                  Sign in
                </Button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <div className="ml-1 flex items-center">
                <UserButton appearance={{ elements: { avatarBox: "size-8" } }}>
                  {workspaces.length > 0 && (
                    <UserButton.MenuItems>
                      {workspaces.map((w) => (
                        <UserButton.Link key={w.href} label={w.label} href={w.href} labelIcon={<w.icon className="size-4" />} />
                      ))}
                    </UserButton.MenuItems>
                  )}
                </UserButton>
              </div>
            </SignedIn>
          </div>
        </div>
      </header>
      <MobileDock />
    </>
  );
}

/** Thumb-reachable bottom navigation for phones (most citizen reports happen on mobile). */
function MobileDock() {
  const pathname = usePathname();
  const { links, showReport } = useNav();
  if (pathname.startsWith("/dashboard") || pathname === "/report") return null;

  const items: NavItem[] = [{ href: "/", label: "Home", icon: Home }, ...links.slice(0, showReport ? 3 : 4)];
  const left = items.slice(0, 2);
  const right = items.slice(2, 4);

  const Item = ({ item }: { item: NavItem }) => {
    const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
    return (
      <Link
        href={item.href}
        className={cn(
          "flex flex-1 flex-col items-center gap-0.5 py-1 text-[10px] font-medium text-muted-foreground transition-colors",
          active && "text-foreground"
        )}
      >
        <item.icon className={cn("size-5", active && "text-primary")} strokeWidth={active ? 2.4 : 2} />
        <span className="max-w-16 truncate">{item.label}</span>
      </Link>
    );
  };

  return (
    <nav
      aria-label="Mobile"
      className="fixed inset-x-3 bottom-3 z-[900] flex items-center rounded-2xl border bg-card/90 px-2 py-1.5 shadow-[var(--shadow-lift)] backdrop-blur-xl md:hidden safe-bottom"
    >
      {left.map((i) => (
        <Item key={i.href} item={i} />
      ))}
      {showReport ? (
        <Link
          href="/report"
          aria-label="Report a rescue"
          className="mx-1 -mt-7 grid size-14 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-[0_10px_24px_-8px_var(--primary)] ring-4 ring-background transition active:scale-95"
        >
          <Activity className="size-6" />
        </Link>
      ) : null}
      {right.map((i) => (
        <Item key={i.href} item={i} />
      ))}
    </nav>
  );
}
