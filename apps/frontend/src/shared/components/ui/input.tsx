import * as React from "react"
import { cn } from "@/shared/lib/utils"

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-foreground/[0.08] bg-foreground/[0.04] px-3 py-2 text-sm text-foreground shadow-sm outline-none transition-colors placeholder:text-foreground/30 focus:border-foreground/20 focus:ring-1 focus:ring-foreground/10 disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        ref={ref}
        {...props}
      />
    )
  },
)
Input.displayName = "Input"

export { Input }
