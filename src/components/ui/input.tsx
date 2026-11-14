import * as React from "react";
import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "flex h-11 w-full min-w-0 rounded-xl border border-input bg-card px-3.5 text-[15px] shadow-xs transition-[border,box-shadow] outline-none placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-4 focus-visible:ring-ring/15 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/15 file:border-0 file:bg-transparent file:text-sm file:font-medium",
        className
      )}
      {...props}
    />
  );
}

export { Input };
