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

  const navItems = SETTINGS_NAV.filter(
    (item) => !item.roles || item.roles.includes(org.role),
  )

  const isActive = (href: string) => router.pathname.endsWith("/" + href)

  return (
    <div className="flex min-h-full flex-col gap-6 md:flex-row md:gap-8">
      <nav className="flex gap-1 overflow-x-auto border-b border-foreground/[0.06] pb-3 md:hidden">
        {navItems.map((item) => {
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={`${basePath}/${item.href}`}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-sm whitespace-nowrap transition-colors",
                active
                  ? "bg-foreground/[0.08] text-foreground"
                  : "text-foreground/50 hover:bg-foreground/[0.04] hover:text-foreground",
              )}
            >
              {item.label}
            </Link>
          )
        })}
      </nav>

      <aside className="hidden w-48 shrink-0 md:block">
        <div className="sticky top-6">
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-foreground/25">
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
                    {item.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <div className="mx-auto max-w-3xl">{children}</div>
      </div>
    </div>
  )
}
