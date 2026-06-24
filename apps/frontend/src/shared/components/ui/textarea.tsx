import * as React from "react"
import { cn } from "@/shared/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(
        "flex min-h-[80px] w-full rounded-md border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white shadow-sm outline-none transition-colors",
        "placeholder:text-white/30",
        "focus:border-white/20 focus:ring-1 focus:ring-white/10",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "resize-y",
        className,
      )}
      {...props}
    />
  )
}

export { Textarea }
