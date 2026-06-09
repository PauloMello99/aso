import * as React from "react"
import Link from "next/link"
import { ChevronRight, Menu } from "lucide-react"
import { cn } from "@/shared/lib/utils"
import { UserMenu } from "./user-menu"

export interface BreadcrumbItem {
  label: string
  href?: string
  /** Custom render — if provided, overrides the default label/href rendering */
  node?: React.ReactNode
}

interface TopHeaderProps {
  breadcrumbs: BreadcrumbItem[]
  /** Called when the hamburger button is pressed (mobile only) */
  onMobileMenuToggle?: () => void
}

export function TopHeader({ breadcrumbs, onMobileMenuToggle }: TopHeaderProps) {
  return (
    // relative + z-10: elevates the header's stacking context above the sidebar so
    // the OrgSwitcher dropdown (absolute, z-50 within this context) paints on top.
    // backdrop-filter (backdrop-blur-sm) creates a stacking context but without a
    // z-index it loses to siblings that come later in the DOM.
    <header className="relative z-10 flex h-14 shrink-0 items-center border-b border-white/[0.06] bg-background/95 backdrop-blur-sm">
      <div className="mx-auto flex w-full max-w-7xl items-center gap-3 px-4 sm:px-6">
        {/* Hamburger — mobile only, shown when a sidebar exists */}
        {onMobileMenuToggle && (
          <button
            onClick={onMobileMenuToggle}
            className="flex h-8 w-8 items-center justify-center rounded-md text-white/50 transition-colors hover:bg-white/[0.06] hover:text-white md:hidden"
            aria-label="Abrir menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}

        {/* Logo */}
        <Link
          href="/dashboard/organizations"
          className="shrink-0 text-sm font-bold tracking-tight"
        >
          ink<span className="text-orange-500">ops</span>
        </Link>

        {/* Breadcrumb */}
        {breadcrumbs.length > 0 && (
          <>
            {/* Logo → breadcrumb separator — always visible */}
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-white/20" />
            <nav aria-label="Breadcrumb" className="min-w-0 flex-1">
              <ol className="flex items-center gap-1.5">
                {breadcrumbs.map((item, i) => {
                  const isLast = i === breadcrumbs.length - 1
                  return (
                    <React.Fragment key={item.label}>
                      {/* Internal separators — hidden on mobile.
                          On mobile only i===0 (OrgSwitcher) is visible, so
                          separators between items would be orphaned. */}
                      {i > 0 && (
                        <ChevronRight className="hidden h-3 w-3 shrink-0 text-white/20 sm:block" />
                      )}

                      {/* Visibility:
                          - Mobile: show only i===0 (OrgSwitcher) so the user can
                            switch orgs without opening the drawer.
                          - Desktop (sm+): show everything. */}
                      <li className={cn("min-w-0", i !== 0 && "hidden sm:block")}>
                        {item.node ? (
                          item.node
                        ) : item.href && !isLast ? (
                          <Link
                            href={item.href}
                            className="block truncate text-sm text-white/50 transition-colors hover:text-white"
                          >
                            {item.label}
                          </Link>
                        ) : (
                          <span
                            className={cn(
                              "block truncate text-sm",
                              isLast
                                ? "font-medium text-white"
                                : "text-white/50",
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

        {/* Spacer when no breadcrumb */}
        {breadcrumbs.length === 0 && <div className="flex-1" />}

        {/* User menu */}
        <UserMenu />
      </div>
    </header>
  )
}
