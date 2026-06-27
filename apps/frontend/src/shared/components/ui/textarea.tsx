import * as React from "react"
import { cn } from "@/shared/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(
        "flex min-h-[80px] w-full rounded-md border border-foreground/[0.08] bg-foreground/[0.04] px-3 py-2 text-sm text-foreground shadow-sm outline-none transition-colors",
        "placeholder:text-foreground/30",
        "focus:border-foreground/20 focus:ring-1 focus:ring-foreground/10",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "resize-y",
        className,
      )}
      {...props}
    />
  )
}

export { Textarea }
