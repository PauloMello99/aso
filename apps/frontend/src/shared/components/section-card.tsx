import * as React from "react"
import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/shared/lib/utils"

export function SectionCard({
  title,
  icon: Icon,
  href,
  className,
  children,
}: {
  title: string
  icon: LucideIcon
  href?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div
      className={cn(
        "flex min-h-[13rem] flex-col rounded-xl border border-border-subtle bg-surface-1 p-5",
        className,
      )}
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary-text" />
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
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
