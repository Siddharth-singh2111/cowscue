"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { SignInButton, SignedIn, SignedOut, UserButton, useUser } from "@clerk/nextjs";
import { ShieldPlus, Map, LayoutDashboard, HeartHandshake } from "lucide-react";

const Navbar = () => {
  const { user } = useUser();
  const pathname = usePathname(); // To highlight the active tab
  const email = user?.primaryEmailAddress?.emailAddress;

  // 🟢 List of authorized NGO Admins
  const ADMIN_EMAILS = [
    "secretwars495@gmail.com", 
    "sahilsinghrajpoot45@gmail.com"
  ];
  
  const isAdmin = email ? ADMIN_EMAILS.includes(email) : false;

  return (
    <nav className="sticky top-0 z-50 w-full bg-black backdrop-blur-md border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
          {/* LEFT: Logo */}
          <div className="flex-shrink-0 flex items-center gap-2">
            <div className="bg-orange-100 p-2 rounded-xl text-orange-600">
              <ShieldPlus size={24} />
            </div>
            <Link href="/" className="font-extrabold text-2xl text-white tracking-tight hover:opacity-80 transition-opacity">
              Cow<span className="text-orange-600">Scue</span>
            </Link>
          </div>

          {/* RIGHT: Navigation & Auth */}
          <div className="flex items-center gap-2 sm:gap-4">
            <SignedIn>
              
              {/* ADMIN ONLY LINKS */}
              {isAdmin && (
                <Link href="/dashboard">
                  <Button 
                    variant={pathname === "/dashboard" ? "secondary" : "ghost"} 
                    className={`font-bold hidden sm:flex ${pathname === "/dashboard" ? "bg-orange-100 text-orange-700" : "text-white hover:text-orange-600"}`}
                  >
                    <LayoutDashboard size={18} className="mr-2" /> 
                    Command Center
                  </Button>
                </Link>
              )}

              {/* EVERYONE LINKS */}
              <Link href="/my-reports">
                <Button 
                  variant={pathname === "/my-reports" ? "secondary" : "ghost"} 
                  className={`hidden sm:flex ${pathname === "/my-reports" ? "bg-slate-100 text-slate-900" : "text-white"}`}
                >
                  <Map size={18} className="mr-2" /> 
                  My Impact
                </Button>
              </Link>

              <Link href="/report">
                <Button className="bg-orange-600 hover:bg-orange-700 text-white shadow-md transition-all hover:shadow-lg">
                  <span className="hidden sm:inline">Report Emergency</span>
                  <span className="sm:hidden flex items-center gap-1"><HeartHandshake size={16}/> Report</span>
                </Button>
              </Link>
              
              <div className="ml-2 border-l border-slate-200 pl-4 py-1">
                <UserButton afterSignOutUrl="/"/>
              </div>
            </SignedIn>

            <SignedOut>
              <SignInButton mode="modal">
                <Button className="bg-slate-900 text-white hover:bg-slate-800 rounded-full px-6">
                  Sign In / Join
                </Button>
              </SignInButton>
            </SignedOut>
          </div>
        </div>
      </div>

      {/* MOBILE BOTTOM NAVIGATION (Optional but great for UX) */}
      <SignedIn>
        <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 pb-safe z-50 flex justify-around p-2 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
           <Link href="/" className={`flex flex-col items-center p-2 rounded-lg ${pathname === "/" ? "text-orange-600 bg-orange-50" : "text-slate-500"}`}>
             <ShieldPlus size={20} />
             <span className="text-[10px] font-medium mt-1">Home</span>
           </Link>
           <Link href="/my-reports" className={`flex flex-col items-center p-2 rounded-lg ${pathname === "/my-reports" ? "text-orange-600 bg-orange-50" : "text-slate-500"}`}>
             <Map size={20} />
             <span className="text-[10px] font-medium mt-1">History</span>
           </Link>
           {isAdmin && (
             <Link href="/dashboard" className={`flex flex-col items-center p-2 rounded-lg ${pathname === "/dashboard" ? "text-orange-600 bg-orange-50" : "text-slate-500"}`}>
               <LayoutDashboard size={20} />
               <span className="text-[10px] font-medium mt-1">Dash</span>
             </Link>
           )}
        </div>
      </SignedIn>
    </nav>
  );
};

export default Navbar;