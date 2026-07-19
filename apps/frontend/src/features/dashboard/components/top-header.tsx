import * as React from "react"
import Link from "next/link"
import { ChevronRight, Menu } from "lucide-react"
import { cn } from "@/shared/lib/utils"
import { BrandWordmark } from "@/shared/components/brand-wordmark"
import { NotificationBell } from "@/features/notifications"
import { UserMenu } from "./user-menu"

export interface BreadcrumbItem {
  label: string
  href?: string
  node?: React.ReactNode
}

interface TopHeaderProps {
  breadcrumbs: BreadcrumbItem[]
  onMobileMenuToggle?: () => void
}

export function TopHeader({ breadcrumbs, onMobileMenuToggle }: TopHeaderProps) {
  return (
    <header className="relative z-10 flex h-14 shrink-0 items-center border-b border-foreground/[0.06] bg-background/95 backdrop-blur-sm">
      <div className="mx-auto flex w-full max-w-7xl items-center gap-3 px-4 sm:px-6">
        {onMobileMenuToggle && (
          <button
            onClick={onMobileMenuToggle}
            className="flex h-8 w-8 items-center justify-center rounded-md text-foreground/50 transition-colors hover:bg-foreground/[0.06] hover:text-foreground md:hidden"
            aria-label="Abrir menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}

        <Link href="/dashboard/organizations" className="shrink-0">
          <BrandWordmark className="text-sm font-bold tracking-tight" />
        </Link>

        {breadcrumbs.length > 0 && (
          <>
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-foreground/20" />
            <nav aria-label="Breadcrumb" className="min-w-0 flex-1">
              <ol className="flex items-center gap-1.5">
                {breadcrumbs.map((item, i) => {
                  const isLast = i === breadcrumbs.length - 1
                  return (
                    <React.Fragment key={item.label}>
                      {i > 0 && (
                        <ChevronRight className="hidden h-3 w-3 shrink-0 text-foreground/20 sm:block" />
                      )}

                      <li className={cn("min-w-0", i !== 0 && "hidden sm:block")}>
                        {item.node ? (
                          item.node
                        ) : item.href && !isLast ? (
                          <Link
                            href={item.href}
                            className="block truncate text-sm text-foreground/50 transition-colors hover:text-foreground"
                          >
                            {item.label}
                          </Link>
                        ) : (
                          <span
                            className={cn(
                              "block truncate text-sm",
                              isLast
                                ? "font-medium text-foreground"
                                : "text-foreground/50",
                            )}
                          >
                            {item.label}
                          </span>
                        )}
                      </li>
                    </React.Fragment>
                  )
                })}
              </ol>
            </nav>
          </>
        )}

        {breadcrumbs.length === 0 && <div className="flex-1" />}

        <NotificationBell />
        <UserMenu />
      </div>
    </header>
  )
}
