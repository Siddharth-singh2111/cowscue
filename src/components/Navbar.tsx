"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image"; // 🟢 1. Import the Image component
import { Button } from "@/components/ui/button";
import { SignInButton, SignedIn, SignedOut, UserButton, useUser } from "@clerk/nextjs";
import { Map, LayoutDashboard, HeartHandshake, Trophy } from "lucide-react"; // Removed ShieldPlus

const Navbar = () => {
  const { user } = useUser();
  const pathname = usePathname(); 

  const role = user?.publicMetadata?.role as string | undefined;
  const isAdmin = role === "ngo";

  return (
    <nav className="sticky top-0 z-50 w-full bg-black backdrop-blur-md border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
          {/* LEFT: Logo */}
          <div className="flex-shrink-0 flex items-center gap-2">
            <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <div className="relative w-10 h-10 flex items-center justify-center bg-white rounded-xl overflow-hidden p-1">
                <Image 
                  src="/image.png"
                  alt="Cowscue Logo" 
                  fill
                  className="object-contain"
                  priority 
                />
              </div>
              <span className="font-extrabold text-2xl text-white tracking-tight hidden sm:block">
                Cow<span className="text-orange-600">Scue</span>
              </span>
            </Link>
          </div>

          {/* RIGHT: Navigation & Auth */}
          <div className="flex items-center gap-2 sm:gap-4">
            <SignedIn>
              {isAdmin ? (
                /* --- NGO ADMIN VIEW --- */
                <Link href="/dashboard">
                  <Button 
                    variant={pathname === "/dashboard" ? "secondary" : "ghost"} 
                    className={`font-bold hidden sm:flex ${pathname === "/dashboard" ? "bg-orange-100 text-orange-700" : "text-white hover:text-orange-600"}`}
                  >
                    <LayoutDashboard size={18} className="mr-2" /> 
                    Command Center
                  </Button>
                </Link>
              ) : (
                /* --- REGULAR CITIZEN VIEW --- */
                <>
                  <Link href="/leaderboard">
                    <Button 
                      variant={pathname === "/leaderboard" ? "secondary" : "ghost"} 
                      className={`hidden sm:flex ${pathname === "/leaderboard" ? "bg-orange-50 text-orange-600" : "text-white hover:text-orange-400"}`}
                    >
                      <Trophy size={18} className="mr-2" /> 
                      Leaderboard
                    </Button>
                  </Link>

                  <Link href="/my-reports">
                    <Button 
                      variant={pathname === "/my-reports" ? "secondary" : "ghost"} 
                      className={`hidden sm:flex ${pathname === "/my-reports" ? "bg-slate-100 text-slate-900" : "text-white hover:text-slate-300"}`}
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
                </>
              )}
              
              <div className="ml-2 border-l border-slate-700 pl-4 py-1">
                <UserButton afterSignOutUrl="/"/>
              </div>
            </SignedIn>

            <SignedOut>
              <SignInButton mode="modal">
                <Button className="bg-slate-800 text-white hover:bg-slate-700 rounded-full px-6 border border-slate-600">
                  Sign In / Join
                </Button>
              </SignInButton>
            </SignedOut>
          </div>
        </div>
      </div>

      {/* MOBILE BOTTOM NAVIGATION */}
      <SignedIn>
        <div className="sm:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 pb-safe z-50 flex justify-around p-2 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
           <Link href="/" className={`flex flex-col items-center p-2 rounded-lg ${pathname === "/" ? "text-orange-600 bg-orange-50" : "text-slate-500"}`}>
             {/* 🟢 3. Optional: You can replace the mobile home icon with your logo too if you want! */}
             <div className="relative w-6 h-6">
                <Image src="/logo.png" alt="Home" fill className="object-contain" />
             </div>
             <span className="text-[10px] font-medium mt-1">Home</span>
           </Link>
           
           {isAdmin ? (
             <Link href="/dashboard" className={`flex flex-col items-center p-2 rounded-lg ${pathname === "/dashboard" ? "text-orange-600 bg-orange-50" : "text-slate-500"}`}>
               <LayoutDashboard size={20} />
               <span className="text-[10px] font-medium mt-1">Dash</span>
             </Link>
           ) : (
             <>
               <Link href="/my-reports" className={`flex flex-col items-center p-2 rounded-lg ${pathname === "/my-reports" ? "text-orange-600 bg-orange-50" : "text-slate-500"}`}>
                 <Map size={20} />
                 <span className="text-[10px] font-medium mt-1">History</span>
               </Link>
               <Link href="/leaderboard" className={`flex flex-col items-center p-2 rounded-lg ${pathname === "/leaderboard" ? "text-orange-600 bg-orange-50" : "text-slate-500"}`}>
                 <Trophy size={20} />
                 <span className="text-[10px] font-medium mt-1">Rank</span>
               </Link>
             </>
           )}
        </div>
      </SignedIn>
    </nav>
  );
};

export default Navbar;