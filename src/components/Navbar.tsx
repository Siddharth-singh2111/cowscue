"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { SignInButton, SignedIn, SignedOut, UserButton, useUser } from "@clerk/nextjs";
import { Map, LayoutDashboard, HeartHandshake, Trophy, Sparkles } from "lucide-react";

const Navbar = () => {
  const { user } = useUser();
  const pathname = usePathname(); 

  const role = user?.publicMetadata?.role as string | undefined;
  const isAdmin = role === "ngo";

  return (
    <>
      {/* --- DESKTOP FLOATING NAVBAR --- */}
      <div className="fixed top-0 sm:top-4 w-full z-50 px-0 sm:px-4 flex justify-center pointer-events-none">
        <nav className="pointer-events-auto w-full max-w-6xl bg-white/80 sm:bg-white/70 backdrop-blur-xl sm:border border-slate-200/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] sm:rounded-full px-4 sm:px-6 h-16 sm:h-16 flex justify-between items-center transition-all">
          
          {/* LEFT: Logo Area */}
          <div className="flex-shrink-0 flex items-center">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="relative w-10 h-10 flex items-center justify-center bg-gradient-to-br from-orange-100 to-orange-50 rounded-full border border-orange-200/50 shadow-inner overflow-hidden group-hover:scale-105 transition-transform duration-300">
                <Image 
                  src="/1.png"
                  alt="Cowscue Logo" 
                  fill
                  className="object-contain p-1.5 drop-shadow-sm"
                  priority 
                />
              </div>
              <span className="font-extrabold text-2xl tracking-tight hidden sm:block text-slate-800">
                Cow<span className="text-orange-600">Scue</span>
              </span>
            </Link>
          </div>

          {/* RIGHT: Navigation & Auth */}
          <div className="flex items-center gap-1 sm:gap-2">
            <SignedIn>
              {isAdmin ? (
                /* --- NGO ADMIN VIEW --- */
                <Link href="/dashboard">
                  <Button 
                    variant="ghost"
                    className={`font-semibold hidden sm:flex rounded-full px-5 transition-all ${
                      pathname === "/dashboard" 
                        ? "bg-slate-900 text-white hover:bg-slate-800 shadow-md" 
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    }`}
                  >
                    <LayoutDashboard size={18} className="mr-2" /> 
                    Command Center
                  </Button>
                </Link>
              ) : (
                /* --- REGULAR CITIZEN VIEW --- */
                <div className="hidden sm:flex items-center gap-1 bg-slate-100/50 p-1 rounded-full border border-slate-200/50">
                  <Link href="/leaderboard">
                    <Button 
                      variant="ghost" 
                      className={`rounded-full px-4 h-9 font-medium transition-all ${
                        pathname === "/leaderboard" 
                          ? "bg-white text-orange-600 shadow-sm border border-slate-200/50" 
                          : "text-slate-500 hover:text-slate-900 hover:bg-slate-200/50"
                      }`}
                    >
                      <Trophy size={16} className="mr-2" /> Rank
                    </Button>
                  </Link>

                  <Link href="/my-reports">
                    <Button 
                      variant="ghost" 
                      className={`rounded-full px-4 h-9 font-medium transition-all ${
                        pathname === "/my-reports" 
                          ? "bg-white text-slate-900 shadow-sm border border-slate-200/50" 
                          : "text-slate-500 hover:text-slate-900 hover:bg-slate-200/50"
                      }`}
                    >
                      <Map size={16} className="mr-2" /> Impact
                    </Button>
                  </Link>
                </div>
              )}
              
              {/* Report Emergency Button (Desktop) */}
              {!isAdmin && (
                <Link href="/report" className="hidden sm:block ml-2">
                  <Button className="rounded-full bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-700 hover:to-amber-600 text-white shadow-lg shadow-orange-500/25 border-0 font-semibold px-6 transition-all hover:-translate-y-0.5">
                    <HeartHandshake size={18} className="mr-2" /> Report Rescue
                  </Button>
                </Link>
              )}
              
              {/* User Profile Area */}
              <div className="ml-2 sm:ml-4 pl-2 sm:pl-4 border-l border-slate-200 flex items-center h-8">
                <div className="ring-2 ring-slate-100 rounded-full overflow-hidden hover:ring-orange-200 transition-all">
                  <UserButton afterSignOutUrl="/" appearance={{ elements: { avatarBox: "w-8 h-8" } }}/>
                </div>
              </div>
            </SignedIn>

            <SignedOut>
              <SignInButton mode="modal">
                <Button className="rounded-full bg-slate-900 text-white hover:bg-slate-800 px-6 font-semibold shadow-md hover:shadow-lg transition-all">
                  Sign In <Sparkles size={16} className="ml-2 text-orange-400" />
                </Button>
              </SignInButton>
            </SignedOut>
          </div>
        </nav>
      </div>

      {/* --- MOBILE FLOATING DOCK NAVBAR --- */}
      <SignedIn>
        <div className="sm:hidden fixed bottom-6 left-4 right-4 z-50 pointer-events-none">
          <div className="pointer-events-auto bg-slate-900/95 backdrop-blur-xl border border-slate-700/50 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.5)] rounded-full px-4 py-3 flex justify-around items-center max-w-sm mx-auto">
            
            <Link href="/" className={`flex flex-col items-center gap-1 transition-colors relative ${pathname === "/" ? "text-white" : "text-slate-400 hover:text-slate-200"}`}>
              {pathname === "/" && <span className="absolute -top-3 w-1 h-1 bg-orange-500 rounded-full shadow-[0_0_8px_2px_rgba(249,115,22,0.5)]"></span>}
              <div className="relative w-6 h-6 grayscale brightness-200 contrast-200 opacity-80 data-[active=true]:grayscale-0 data-[active=true]:opacity-100 data-[active=true]:brightness-100" data-active={pathname === "/"}>
                 <Image src="/favicon.ico" alt="Home" fill className="object-contain" />
              </div>
              <span className="text-[9px] font-semibold tracking-wider">HOME</span>
            </Link>
            
            {isAdmin ? (
              <Link href="/dashboard" className={`flex flex-col items-center gap-1 transition-colors relative ${pathname === "/dashboard" ? "text-orange-400" : "text-slate-400 hover:text-slate-200"}`}>
                {pathname === "/dashboard" && <span className="absolute -top-3 w-1 h-1 bg-orange-500 rounded-full shadow-[0_0_8px_2px_rgba(249,115,22,0.5)]"></span>}
                <LayoutDashboard size={22} strokeWidth={pathname === "/dashboard" ? 2.5 : 2} />
                <span className="text-[9px] font-semibold tracking-wider">DASH</span>
              </Link>
            ) : (
              <>
                <Link href="/my-reports" className={`flex flex-col items-center gap-1 transition-colors relative ${pathname === "/my-reports" ? "text-white" : "text-slate-400 hover:text-slate-200"}`}>
                  {pathname === "/my-reports" && <span className="absolute -top-3 w-1 h-1 bg-orange-500 rounded-full shadow-[0_0_8px_2px_rgba(249,115,22,0.5)]"></span>}
                  <Map size={22} strokeWidth={pathname === "/my-reports" ? 2.5 : 2} />
                  <span className="text-[9px] font-semibold tracking-wider">IMPACT</span>
                </Link>

                {/* Mobile Floating Action Button (FAB) embedded in the dock */}
                <Link href="/report" className="relative -top-6 bg-gradient-to-br from-orange-500 to-orange-600 text-white p-4 rounded-full shadow-lg shadow-orange-500/40 border-4 border-slate-50 border-opacity-10 hover:scale-110 transition-transform">
                  <HeartHandshake size={24} />
                </Link>

                <Link href="/leaderboard" className={`flex flex-col items-center gap-1 transition-colors relative ${pathname === "/leaderboard" ? "text-yellow-400" : "text-slate-400 hover:text-slate-200"}`}>
                  {pathname === "/leaderboard" && <span className="absolute -top-3 w-1 h-1 bg-yellow-400 rounded-full shadow-[0_0_8px_2px_rgba(250,204,21,0.5)]"></span>}
                  <Trophy size={22} strokeWidth={pathname === "/leaderboard" ? 2.5 : 2} />
                  <span className="text-[9px] font-semibold tracking-wider">RANK</span>
                </Link>
              </>
            )}
          </div>
        </div>
      </SignedIn>
    </>
  );
};

export default Navbar;