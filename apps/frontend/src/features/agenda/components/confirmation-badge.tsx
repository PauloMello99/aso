import { cn } from "@/shared/lib/utils"
import { getConfirmationBadge, type ConfirmationTone } from "../lib/confirmation-status"
import type { CalendarEvent } from "../types"

const DOT_CLASS: Record<ConfirmationTone, string> = {
  neutral: "bg-foreground/40",
  warning: "bg-warning",
  success: "bg-success",
  danger: "bg-destructive",
}

interface ConfirmationBadgeProps {
  event: CalendarEvent
  /** Só o ponto colorido (month-view); o rótulo vai em aria-label/title. */
  dotOnly?: boolean
  className?: string
}

export function ConfirmationBadge({
  event,
  dotOnly = false,
  className,
}: ConfirmationBadgeProps) {
  const badge = getConfirmationBadge(event)
  if (!badge) return null

  if (dotOnly) {
    return (
      <span
        role="img"
        aria-label={badge.label}
        title={badge.label}
        className={cn(
          "inline-block h-1.5 w-1.5 shrink-0 rounded-full",
          DOT_CLASS[badge.tone],
          className,
        )}
      />
    )
  }

  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1 text-[10px] leading-tight opacity-90",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn("h-1.5 w-1.5 shrink-0 rounded-full", DOT_CLASS[badge.tone])}
      />
      <span className="truncate">{badge.label}</span>
    </span>
  )
}
