"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/router"
import { cn } from "@/shared/lib/utils"
import { useCurrentOrg } from "@/features/dashboard/components/org-context"
import { SETTINGS_NAV } from "@/features/dashboard/lib/nav"

interface OrgSettingsLayoutProps {
  children: React.ReactNode
}

export function OrgSettingsLayout({ children }: OrgSettingsLayoutProps) {
  const router = useRouter()
  const { org } = useCurrentOrg()
  const basePath = `/dashboard/org/${org.slug}`

  // Funcionário só vê as seções que pode acessar (ex.: Agenda).
  const navItems = SETTINGS_NAV.filter(
    (item) => !item.roles || item.roles.includes(org.role),
  )

  const isActive = (href: string) => router.pathname.endsWith("/" + href)

  return (
    <div className="flex min-h-full flex-col gap-4 md:flex-row md:gap-0">
      {/* Mobile: horizontal tab bar */}
      <nav className="flex gap-1 overflow-x-auto border-b border-white/[0.06] pb-3 md:hidden">
        {navItems.map((item) => {
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={`${basePath}/${item.href}`}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-sm whitespace-nowrap transition-colors",
                active
                  ? "bg-white/[0.08] text-white"
                  : "text-white/50 hover:bg-white/[0.04] hover:text-white",
              )}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Desktop: vertical sidebar */}
      <aside className="hidden w-44 shrink-0 border-r border-white/[0.06] pr-2 md:block">
        <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-white/25">
          Configurações
        </p>
        <ul className="space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)
            return (
              <li key={item.href}>
                <Link
                  href={`${basePath}/${item.href}`}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                    active
                      ? "bg-white/[0.08] text-white"
                      : "text-white/50 hover:bg-white/[0.04] hover:text-white",
                  )}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0",
                      active ? "text-orange-400" : "text-white/40",
                    )}
                  />
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>
      </aside>

      {/* Page content */}
      <div className="min-w-0 flex-1 md:pl-6">{children}</div>
    </div>
  )
}
