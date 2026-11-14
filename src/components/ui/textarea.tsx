import * as React from "react";
import { cn } from "@/lib/utils";

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "flex min-h-24 w-full rounded-xl border border-input bg-card px-3.5 py-3 text-[15px] shadow-xs transition-[border,box-shadow] outline-none placeholder:text-muted-foreground/70 focus-visible:border-ring focus-visible:ring-4 focus-visible:ring-ring/15 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  );
}

export { Textarea };
