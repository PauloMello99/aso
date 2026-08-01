import * as React from "react"
import { ArrowDown, ArrowUp, type LucideIcon } from "lucide-react"
import { cn } from "@/shared/lib/utils"

interface KpiCardProps {
  label: string
  value: React.ReactNode
  icon: LucideIcon
  iconClassName?: string
  emphasis?: boolean
  negative?: boolean
  loading?: boolean
  delta?: { text: string; direction: "up" | "down" }
  className?: string
}

export function KpiCard({
  label,
  value,
  icon: Icon,
  iconClassName = "text-primary-text",
  emphasis,
  negative,
  loading,
  delta,
  className,
}: KpiCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border p-4",
        emphasis
          ? "border-primary-border bg-primary/[0.04]"
          : "border-border-subtle bg-surface-1",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <Icon className={cn("h-4 w-4", iconClassName)} />
        <span className="text-xs text-text-muted">{label}</span>
      </div>
      {loading ? (
        <div className="mt-2 h-8 w-28 animate-pulse rounded bg-surface-2" />
      ) : (
        <div className="mt-2 flex items-center gap-2">
          <p
            className={cn(
              "text-2xl font-semibold tabular-nums",
              negative ? "text-destructive" : "text-foreground",
            )}
          >
            {value}
          </p>
          {delta && (
            <span
              className={cn(
                "flex items-center gap-0.5 text-xs",
                delta.direction === "up" ? "text-success" : "text-destructive",
              )}
            >
              {delta.direction === "up" ? (
                <ArrowUp className="h-3 w-3" />
              ) : (
                <ArrowDown className="h-3 w-3" />
              )}
              {delta.text}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
