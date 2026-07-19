"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/router"
import { LayoutDashboard, Building2, Users, CreditCard, Shield, ArrowLeft, Loader2, ShieldCheck } from "lucide-react"
import { cn } from "@/shared/lib/utils"
import { BrandWordmark } from "@/shared/components/brand-wordmark"
import { useMe } from "@/features/auth/hooks/use-me"
import { UserMenu } from "@/features/dashboard/components/user-menu"

const NAV = [
  { href: "/admin", label: "Visão geral", icon: LayoutDashboard },
  { href: "/admin/orgs", label: "Organizações", icon: Building2 },
  { href: "/admin/users", label: "Usuários", icon: Users },
  { href: "/admin/billing", label: "Assinaturas", icon: CreditCard },
  { href: "/admin/audit-logs", label: "Auditoria", icon: Shield },
]

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { me, loading } = useMe()

  const isSuperAdmin = me?.platformRole === "super_admin"

  React.useEffect(() => {
    if (!loading && me && !isSuperAdmin) {
      void router.replace("/dashboard/organizations")
    }
  }, [loading, me, isSuperAdmin, router])

  if (loading || !me) {
    return (
      <div className="flex min-h-screen items-center justify-center text-foreground/30">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    )
  }

  if (!isSuperAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-foreground/40">
        Acesso restrito ao super_admin.
      </div>
    )
  }

  const isActive = (href: string) =>
    href === "/admin"
      ? router.pathname === "/admin"
      : router.pathname.startsWith(href)

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-foreground/[0.06] bg-background/80 px-4 py-2.5 backdrop-blur sm:px-6">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <BrandWordmark className="text-sm" suffix="Plataforma" />
        </div>
        <div className="flex items-center gap-1">
          <Link
            href="/dashboard/organizations"
            className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-foreground/50 transition-colors hover:bg-foreground/[0.04] hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Voltar ao app</span>
          </Link>
          <UserMenu />
        </div>
      </header>

      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 md:flex-row md:gap-8">
        <nav className="flex gap-1 overflow-x-auto border-b border-foreground/[0.06] pb-3 md:w-48 md:flex-col md:border-b-0 md:pb-0">
          {NAV.map((item) => {
            const Icon = item.icon
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex shrink-0 items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-foreground/[0.08] text-foreground"
                    : "text-foreground/50 hover:bg-foreground/[0.04] hover:text-foreground",
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0",
                    active ? "text-primary" : "text-foreground/40",
                  )}
                />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  )
}
