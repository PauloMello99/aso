"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/router"
import { PanelLeftClose, PanelLeftOpen, X } from "lucide-react"
import { cn } from "@/shared/lib/utils"
import { Tooltip } from "@/shared/components/ui/tooltip"
import { ORG_NAV_SECTIONS, canAccessModule } from "@/features/dashboard/lib/nav"
import type { OrgSummary } from "@/features/dashboard/hooks/use-orgs"

interface OrgSidebarProps {
  org: OrgSummary
  /** Controlled by OrgLayout — whether the mobile drawer is open */
  mobileOpen?: boolean
  /** Called when the mobile overlay or close button is clicked */
  onMobileClose?: () => void
}

export function OrgSidebar({ org, mobileOpen = false, onMobileClose }: OrgSidebarProps) {
  const router = useRouter()
  const [collapsed, setCollapsed] = React.useState(false)

  const basePath = `/dashboard/org/${org.slug}`

  // Primeiro segmento da rota após [orgSlug] — ex.: "settings/cashier" → "settings".
  const afterOrg = router.pathname.split("/[orgSlug]/")[1] ?? ""
  const currentBase = afterOrg.split("/")[0]

  /**
   * Ativo por SEGMENTO BASE, não pelo fim da rota. Assim `settings/general`
   * marca "Configurações" para qualquer `settings/*` (incl. settings/cashier),
   * e a rota `settings/cashier` não acende o item "Caixa" (href "cashier").
   */
  const isActive = (href: string) => currentBase === href.split("/")[0]

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "flex shrink-0 flex-col border-r border-foreground/[0.06] bg-background",
          // Mobile: fixed drawer — slides in/out
          "fixed bottom-0 top-0 z-50 w-64",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          "transition-all duration-200 ease-in-out",
          // Desktop: back to normal flow, width controlled by collapsed state
          "md:relative md:translate-x-0",
          collapsed ? "md:w-14" : "md:w-56",
        )}
      >
        {/* Header row: org avatar + name + toggle */}
        <div className="flex h-14 shrink-0 items-center border-b border-foreground/[0.06] px-3">
          {/* Mobile close button */}
          <button
            onClick={onMobileClose}
            className="mr-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-foreground/30 hover:bg-foreground/[0.06] hover:text-foreground md:hidden"
            aria-label="Fechar menu"
          >
            <X className="h-4 w-4" />
          </button>

          {!collapsed && (
            <div className="flex min-w-0 flex-1 items-center gap-2.5">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-orange-500/20 text-xs font-bold text-orange-400">
                {org.name.charAt(0).toUpperCase()}
              </span>
              <span className="truncate text-sm font-medium text-foreground">
                {org.name}
              </span>
            </div>
          )}

          {/* Desktop collapse toggle */}
          <Tooltip
            content={collapsed ? "Expandir menu" : "Recolher menu"}
            side="right"
            disabled={!collapsed}
          >
            <button
              onClick={() => setCollapsed((v) => !v)}
              className={cn(
                "hidden h-7 w-7 shrink-0 items-center justify-center rounded-md text-foreground/30 transition-colors hover:bg-foreground/[0.06] hover:text-foreground md:flex",
                collapsed && "mx-auto",
              )}
              aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
            >
              {collapsed ? (
                <PanelLeftOpen className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
            </button>
          </Tooltip>
        </div>

        {/* Nav sections — items filtrados por papel (org.role) via visibleItems */}
        <nav className="flex-1 overflow-y-auto px-2 py-3">
          {ORG_NAV_SECTIONS.map((section, sIdx) => {
            const visibleItems = section.items.filter(
              (item) =>
                (!item.roles || item.roles.includes(org.role)) &&
                canAccessModule(org.role, org.permissions, item.module),
            )
            if (visibleItems.length === 0) return null
            return (
            <div key={sIdx} className={sIdx > 0 ? "mt-4" : undefined}>
              {/* Section label — hidden when collapsed on desktop */}
              {section.label && (
                <p
                  className={cn(
                    "mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-foreground/25",
                    collapsed && "md:hidden",
                  )}
                >
                  {section.label}
                </p>
              )}
              {/* Divider when collapsed + not first section */}
              {section.label && collapsed && sIdx > 0 && (
                <div className="mx-1 mb-2 hidden h-px bg-foreground/[0.06] md:block" />
              )}

              <ul className="space-y-0.5">
                {visibleItems.map((item) => {
                  const Icon = item.icon
                  const active = isActive(item.href)

                  return (
                    <li key={item.href}>
                      <Tooltip
                        content={item.label}
                        side="right"
                        disabled={!collapsed}
                      >
                        <Link
                          href={`${basePath}/${item.href}`}
                          onClick={onMobileClose}
                          data-tour={`nav-${item.href}`}
                          className={cn(
                            "flex items-center rounded-md py-2 text-sm transition-colors",
                            // Desktop collapsed: icon only, centered
                            collapsed ? "md:justify-center md:px-2" : "gap-3 px-3",
                            // Mobile always shows label
                            "gap-3 px-3 md:gap-0 md:px-0",
                            collapsed ? "md:px-2" : "md:gap-3 md:px-3",
                            active
                              ? "bg-foreground/[0.08] text-foreground"
                              : "text-foreground/50 hover:bg-foreground/[0.04] hover:text-foreground",
                          )}
                        >
                          <Icon
                            className={cn(
                              "h-4 w-4 shrink-0",
                              active ? "text-orange-400" : "text-foreground/40",
                            )}
                          />
                          {/* Label: always visible on mobile, hidden when collapsed on desktop */}
                          <span className={cn(collapsed && "md:hidden")}>
                            {item.label}
                          </span>
                        </Link>
                      </Tooltip>
                    </li>
                  )
                })}
              </ul>
            </div>
            )
          })}
        </nav>
      </aside>
    </>
  )
}
