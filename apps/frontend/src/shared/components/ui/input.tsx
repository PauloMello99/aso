import * as React from "react"
import { cn } from "@/shared/lib/utils"

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-white shadow-sm outline-none transition-colors placeholder:text-white/30 focus:border-white/20 focus:ring-1 focus:ring-white/10 disabled:cursor-not-allowed disabled:opacity-50",
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
