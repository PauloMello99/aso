import { AlertTriangle } from "lucide-react"
import { cn } from "@/shared/lib/utils"

interface LowStockBadgeProps {
  className?: string
  compact?: boolean
}

export function LowStockBadge({ className, compact = false }: LowStockBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-orange-500/15 px-2 py-0.5 text-xs font-medium text-orange-400",
        className,
      )}
    >
      <AlertTriangle className="h-3 w-3 shrink-0" />
      {!compact && "Estoque baixo"}
    </span>
  )
}
