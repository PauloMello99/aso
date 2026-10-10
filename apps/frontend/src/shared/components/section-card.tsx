import * as React from "react"
import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/shared/lib/utils"

export function SectionCard({
  title,
  icon: Icon,
  href,
  badge,
  className,
  children,
}: {
  title: string
  icon: LucideIcon
  href?: string
  badge?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div
      className={cn(
        "flex min-h-[13rem] min-w-0 flex-col rounded-xl border border-border-subtle bg-surface-1 p-5",
        className,
      )}
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary-text" />
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          {badge && (
            <span className="rounded-full bg-foreground/[0.06] px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-text-muted">
              {badge}
            </span>
          )}
        </div>
        {href && (
          <Link
            href={href}
            className="text-xs text-text-muted transition-colors hover:text-foreground"
          >
            Ver todos
          </Link>
        )}
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  )
}
