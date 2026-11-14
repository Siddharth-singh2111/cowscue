"use client";

import Link from "next/link";
import { SignInButton } from "@clerk/nextjs";
import { HandHeart, LockKeyhole, Radar } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Shown instead of a redirect when the visitor isn't an approved partner. */
export function Gate({ signedIn }: { signedIn: boolean }) {
  return (
    <div className="relative grid min-h-[calc(100dvh-4rem)] place-items-center overflow-hidden px-4 py-16">
      <div className="bg-grid mask-radial pointer-events-none absolute inset-0 opacity-60" aria-hidden />
      <div className="relative w-full max-w-md rounded-3xl border bg-card p-8 text-center shadow-[var(--shadow-lift)]">
        <div className="mx-auto mb-5 grid size-14 place-items-center rounded-2xl bg-inverse text-inverse-foreground">
          {signedIn ? <Radar className="size-6" /> : <LockKeyhole className="size-6" />}
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Partner command center</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {signedIn
            ? "This workspace is for verified rescue NGOs and gaushalas. Apply to start receiving geofenced rescue alerts for your area."
            : "Sign in with your partner NGO account to see live rescue requests in your coverage area."}
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          {signedIn ? (
            <>
              <Button asChild>
                <Link href="/apply">
                  <HandHeart /> Apply to partner
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/report">Report a rescue instead</Link>
              </Button>
            </>
          ) : (
            <>
              <SignInButton mode="modal">
                <Button>Sign in</Button>
              </SignInButton>
              <Button asChild variant="outline">
                <Link href="/apply">Become a partner</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
