import { cn } from "@/lib/utils";

/** Cowscue mark: a heart with horns — "care for cattle" — on a saffron tile. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-8", className)} aria-hidden>
      <defs>
        <linearGradient id="cowscue-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="oklch(0.74 0.17 60)" />
          <stop offset="1" stopColor="oklch(0.62 0.2 38)" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill="url(#cowscue-g)" />
      <path d="M9.2 9.6c-1.6-.4-2.7-1.8-2.6-3.6 1 1 2.3 1.4 3.7 1.3M22.8 9.6c1.6-.4 2.7-1.8 2.6-3.6-1 1-2.3 1.4-3.7 1.3" stroke="white" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <path d="M16 24.5s-7.5-4.6-7.5-10.1A4.1 4.1 0 0 1 16 12a4.1 4.1 0 0 1 7.5 2.4c0 5.5-7.5 10.1-7.5 10.1Z" fill="white" />
      <path d="M16 15.2v5M13.5 17.7h5" stroke="oklch(0.64 0.2 42)" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ className, showText = true }: { className?: string; showText?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      {showText && <span className="text-[17px] font-semibold tracking-tight">Cowscue</span>}
    </span>
  );
}
