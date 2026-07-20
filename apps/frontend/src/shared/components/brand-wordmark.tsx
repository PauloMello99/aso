import { cn } from "@/shared/lib/utils"

interface BrandWordmarkProps {
  className?: string
  suffix?: string
}

export function BrandWordmark({ className, suffix }: BrandWordmarkProps) {
  return (
    <span className={cn("text-lg font-bold tracking-tight text-foreground", className)}>
      a<span className="text-primary-text">so</span>
      {suffix && (
        <span className="ml-1 text-sm font-normal text-muted-foreground">
          · {suffix}
        </span>
      )}
    </span>
  )
}
