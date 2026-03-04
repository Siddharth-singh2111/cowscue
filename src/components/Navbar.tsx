"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { SignInButton, SignedIn, SignedOut, UserButton, useUser } from "@clerk/nextjs";
import { ShieldPlus, Map, LayoutDashboard, HeartHandshake, TrendingUp } from "lucide-react";
import { ADMIN_EMAILS } from "@/lib/utils"; // FIX: single source of truth

const Navbar = () => {
  const { user } = useUser();
  const pathname = usePathname();
  const email = user?.primaryEmailAddress?.emailAddress;
  const isAdmin = email ? ADMIN_EMAILS.includes(email) : false;

  return (
    <nav className="sticky top-0 z-50 w-full bg-black border-b border-slate-800 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">

          <div className="flex items-center gap-2">
            <div className="bg-orange-500/20 p-2 rounded-xl text-orange-500"><ShieldPlus size={22} /></div>
            <Link href="/" className="font-extrabold text-2xl text-white tracking-tight hover:opacity-80">
              Cow<span className="text-orange-500">Scue</span>
            </Link>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            <Link href="/impact">
              <Button variant="ghost" className={`hidden sm:flex text-sm ${pathname === "/impact" ? "text-orange-400 bg-orange-500/10" : "text-slate-400 hover:text-white"}`}>
                <TrendingUp size={16} className="mr-1" /> Impact
              </Button>
            </Link>

            <SignedIn>
              {isAdmin && (
                <Link href="/dashboard">
                  <Button variant="ghost" className={`hidden sm:flex font-bold text-sm ${pathname === "/dashboard" ? "text-orange-400 bg-orange-500/10" : "text-slate-400 hover:text-white"}`}>
                    <LayoutDashboard size={16} className="mr-1.5" /> Command Center
                  </Button>
                </Link>
              )}
              <Link href="/my-reports">
                <Button variant="ghost" className={`hidden sm:flex text-sm ${pathname === "/my-reports" ? "text-orange-400 bg-orange-500/10" : "text-slate-400 hover:text-white"}`}>
                  <Map size={16} className="mr-1.5" /> My Impact
                </Button>
              </Link>
              <Link href="/report">
                <Button className="bg-orange-600 hover:bg-orange-700 text-white shadow-md ml-1">
                  <span className="hidden sm:inline">Report Emergency</span>
                  <span className="sm:hidden flex items-center gap-1"><HeartHandshake size={15} /> Report</span>
                </Button>
              </Link>
              <div className="ml-2 border-l border-slate-700 pl-3 py-1"><UserButton afterSignOutUrl="/" /></div>
            </SignedIn>

            <SignedOut>
              <SignInButton mode="modal">
                <Button className="bg-orange-600 hover:bg-orange-700 text-white rounded-full px-5">Sign In</Button>
              </SignInButton>
            </SignedOut>
          </div>
        </div>
      </div>

      <SignedIn>
        <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-black border-t border-slate-800 pb-safe z-50 flex justify-around p-2">
          {[
            { href: "/", icon: <ShieldPlus size={20}/>, label: "Home" },
            { href: "/impact", icon: <TrendingUp size={20}/>, label: "Impact" },
            { href: "/my-reports", icon: <Map size={20}/>, label: "History" },
          ].map(({ href, icon, label }) => (
            <Link key={href} href={href} className={`flex flex-col items-center p-2 rounded-lg ${pathname === href ? "text-orange-500" : "text-slate-500"}`}>
              {icon}
              <span className="text-[10px] font-medium mt-1">{label}</span>
            </Link>
          ))}
          {isAdmin && (
            <Link href="/dashboard" className={`flex flex-col items-center p-2 rounded-lg ${pathname === "/dashboard" ? "text-orange-500" : "text-slate-500"}`}>
              <LayoutDashboard size={20}/>
              <span className="text-[10px] font-medium mt-1">Dash</span>
            </Link>
          )}
        </div>
      </SignedIn>
    </nav>
  );
};

export default Navbar;