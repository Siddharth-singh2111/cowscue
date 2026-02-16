"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SignInButton, SignedIn, SignedOut, UserButton, useUser } from "@clerk/nextjs";

const Navbar = () => {
  const { user } = useUser();
  const email = user?.primaryEmailAddress?.emailAddress;

  // 🔴 REPLACE THIS WITH YOUR EMAIL
  const ADMIN_EMAIL = "YOUR_ACTUAL_EMAIL@gmail.com"; 
  
  const isAdmin = email === ADMIN_EMAIL;

  return (
    <nav className="flex justify-between items-center p-4 border-b shadow-sm bg-white sticky top-0 z-50">
      <div className="font-bold text-2xl text-green-700 tracking-tight">
        <Link href="/">Cowscue</Link>
      </div>

      <div className="flex items-center gap-4">
        <SignedIn>
          
          {/* ONLY ADMINS SEE THIS */}
          {isAdmin && (
            <Link href="/dashboard">
              <Button variant="ghost" className="text-red-600 font-bold hover:bg-red-50 hidden sm:block">
                🚨 NGO Dashboard
              </Button>
            </Link>
          )}
          <Link href="/report">
  
</Link>
          {/* EVERYONE SEES THIS */}
          <Link href="/my-reports">
            <Button variant="ghost" className="text-slate-600 hover:bg-slate-100">
              My Reports
            </Button>
          </Link>

          <Link href="/report">
            <Button variant="outline" className="hidden sm:block border-green-600 text-green-700 hover:bg-green-50">
              + New Report
            </Button>
          </Link>
          
          <UserButton afterSignOutUrl="/"/>
        </SignedIn>

        <SignedOut>
          <SignInButton mode="modal">
            <Button>Sign In / Join</Button>
          </SignInButton>
        </SignedOut>
      </div>
    </nav>
  );
};

export default Navbar;