// src/components/Navbar.tsx
import Link from "next/link";
import { Button } from "@/components/ui/button"; // Using our professional button
import { SignInButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";

const Navbar = () => {
  return (
    <nav className="flex justify-between items-center p-4 border-b shadow-sm bg-white">
      <div className="font-bold text-2xl text-green-700 tracking-tight">
        <Link href="/">Cowscue</Link>
      </div>

      <div className="flex items-center gap-4">
        {/* Stuff to show ONLY when signed in */}
        <SignedIn>
          <Link href="/report">
             {/* Using shadcn variant for styling */}
            <Button variant="outline" className="hidden sm:block border-green-600 text-green-700 hover:bg-green-50">
              + New Report
            </Button>
          </Link>
          {/* The little circle with user profile pic */}
          <UserButton afterSignOutUrl="/"/>
        </SignedIn>

        {/* Stuff to show ONLY when signed OUT */}
        <SignedOut>
           {/* Clerk handles the modal popup automatically */}
          <SignInButton mode="modal">
            <Button>Sign In / Join</Button>
          </SignInButton>
        </SignedOut>
      </div>
    </nav>
  );
};

export default Navbar;