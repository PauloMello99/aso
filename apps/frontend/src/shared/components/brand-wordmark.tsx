import { cn } from "@/shared/lib/utils"

interface BrandWordmarkProps {
  className?: string
  suffix?: string
}

export function BrandWordmark({ className, suffix }: BrandWordmarkProps) {
  return (
    <span className={cn("text-lg font-semibold tracking-tight text-foreground", className)}>
      AS<span className="text-primary">O</span>
      {suffix && (
        <span className="ml-1 text-sm font-normal text-muted-foreground">
          · {suffix}
        </span>
      )}
    </span>
  )
}
