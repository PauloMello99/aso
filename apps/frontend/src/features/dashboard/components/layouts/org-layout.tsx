"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/router"
import { ShieldAlert } from "lucide-react"
import { TopHeader } from "@/features/dashboard/components/top-header"
import { OrgSidebar } from "@/features/dashboard/components/org-sidebar"
import { OrgSwitcher } from "@/features/dashboard/components/org-switcher"
import { OrgProvider } from "@/features/dashboard/components/org-context"
import { useOrgs, useResolveOrgBySlug } from "@/features/dashboard/hooks/use-orgs"
import { useOnboardingTour } from "@/features/dashboard/hooks/use-onboarding-tour"
import { useMe } from "@/features/auth/hooks/use-me"
import {
  PAGE_LABELS,
  isOwnerOnlyPath,
  isModuleKey,
  canAccessModule,
} from "@/features/dashboard/lib/nav"
import type { OrgSummary } from "@/features/dashboard/hooks/use-orgs"
import type { BreadcrumbItem } from "@/features/dashboard/components/top-header"

interface OrgLayoutProps {
  children: React.ReactNode
}

/**
 * Builds breadcrumb items for org pages, including settings sub-pages.
 *
 * /dashboard/org/[orgSlug]/overview          → [OrgSwitcher, "Overview"]
 * /dashboard/org/[orgSlug]/settings/billing  → [OrgSwitcher, "Configurações", "Cobrança"]
 */
function buildOrgCrumbs(
  pathname: string,
  slug: string,
  orgSwitcher: React.ReactNode,
): BreadcrumbItem[] {
  const crumbs: BreadcrumbItem[] = [{ label: "Org", node: orgSwitcher }]

  const afterOrg = pathname.split("/[orgSlug]/")[1] ?? ""
  const segments = afterOrg.split("/").filter(Boolean)

  if (segments[0] === "settings") {
    crumbs.push({
      label: "Configurações",
      href: `/dashboard/org/${slug}/settings`,
    })
    const subLabel = segments[1] ? PAGE_LABELS[segments[1]] : undefined
    if (subLabel) crumbs.push({ label: subLabel })
  } else {
    const pageLabel = segments[0] ? PAGE_LABELS[segments[0]] : undefined
    if (pageLabel) crumbs.push({ label: pageLabel })
  }

  return crumbs
}

export function OrgLayout({ children }: OrgLayoutProps) {
  const router = useRouter()
  const { orgSlug } = router.query as { orgSlug?: string }
  const [mobileOpen, setMobileOpen] = React.useState(false)

  const { me } = useMe()
  const { orgs, loading } = useOrgs()
  const listOrg: OrgSummary | undefined = orgs.find((o) => o.slug === orgSlug)

  // super_admin pode gerenciar uma org da qual não é membro: quando a slug não
  // está nas memberships, resolvemos por slug (backend devolve role "owner").
  const isSuper = me?.platformRole === "super_admin"
  const tryResolve = !!orgSlug && !loading && !listOrg && isSuper
  const {
    org: resolvedOrg,
    loading: resolving,
    notFound,
  } = useResolveOrgBySlug(orgSlug, tryResolve)

  // super_admin sempre opera como owner em qualquer org (paridade com o backend).
  const org: OrgSummary | undefined = React.useMemo(() => {
    const base = listOrg ?? resolvedOrg ?? undefined
    if (base && isSuper && base.role !== "owner") {
      return { ...base, role: "owner" as const }
    }
    return base
  }, [listOrg, resolvedOrg, isSuper])

  // Dono real da org (membership owner) — nesse caso o super_admin não está
  // "agindo em nome de", apenas tem o indicador sutil de plataforma.
  const isRealOwner = listOrg?.role === "owner"
  const actingAsAdmin = isSuper && !isRealOwner // funcionário ou não-membro
  const superOwner = isSuper && isRealOwner // owner real + super_admin

  // Slug não pertence ao usuário e ele não é super_admin (ou a resolução falhou)
  // → volta para a lista de orgs.
  React.useEffect(() => {
    if (!orgSlug || loading || listOrg) return
    if (!isSuper || (!resolving && notFound)) {
      void router.replace("/dashboard/organizations")
    }
  }, [orgSlug, loading, listOrg, isSuper, resolving, notFound, router])

  // Funcionário tentando acessar rota owner-only direto pela URL → manda p/ overview.
  // O backend já barra com 403; isto evita renderizar a casca de uma página proibida.
  // settings/agenda fica de fora (funcionário configura a própria agenda).
  const currentSubpath = router.pathname.split("/[orgSlug]/")[1] ?? ""
  React.useEffect(() => {
    if (!org || org.role === "owner") return
    const seg = currentSubpath.split("/")[0] ?? ""
    // Funcionário sem permissão no módulo (ou rota owner-only) → volta p/ overview.
    const lacksModule =
      isModuleKey(seg) && !canAccessModule(org.role, org.permissions, seg)
    if (isOwnerOnlyPath(currentSubpath) || lacksModule) {
      void router.replace(`/dashboard/org/${org.slug}/overview`)
    }
  }, [org, currentSubpath, router])

  // Close mobile sidebar on navigation
  React.useEffect(() => {
    setMobileOpen(false)
  }, [router.pathname])

  // Tour de onboarding: dispara sozinho no primeiro acesso (ou em modo replay via
  // ?tour=1) — hook lida com `org` ainda undefined internamente.
  useOnboardingTour({ me, org, setMobileOpen })

  if (!org) return null

  const orgSwitcher = <OrgSwitcher org={org} />
  const breadcrumbs = buildOrgCrumbs(router.pathname, org.slug, orgSwitcher)

  return (
    <OrgProvider org={org} actingAsAdmin={actingAsAdmin}>
      <div className="flex h-screen flex-col overflow-hidden bg-background">
        {actingAsAdmin ? (
          // Funcionário ou não-membro agindo com poderes de plataforma → aviso forte.
          <div className="flex shrink-0 items-center justify-center gap-2 bg-orange-500/15 px-4 py-1.5 text-center text-xs text-orange-300 sm:text-sm">
            <ShieldAlert className="h-4 w-4 shrink-0" />
            <span>
              Você está gerenciando{" "}
              <strong className="font-semibold">{org.name}</strong> como
              super_admin.
            </span>
            <Link
              href={`/admin/orgs/${org.id}`}
              className="shrink-0 font-medium underline underline-offset-2 hover:text-orange-200"
            >
              Voltar ao painel
            </Link>
          </div>
        ) : superOwner ? (
          // Dono real + super_admin → indicador sutil de contexto de plataforma.
          <div className="flex shrink-0 items-center justify-center gap-1.5 bg-foreground/[0.04] px-4 py-1 text-center text-[11px] text-foreground/40">
            <ShieldAlert className="h-3 w-3 shrink-0" />
            <span>Acesso de super_admin</span>
            <Link
              href="/admin"
              className="shrink-0 underline underline-offset-2 hover:text-foreground/70"
            >
              Painel da plataforma
            </Link>
          </div>
        ) : null}
        <TopHeader
          breadcrumbs={breadcrumbs}
          onMobileMenuToggle={() => setMobileOpen((v) => !v)}
        />
        <div className="flex flex-1 overflow-hidden">
          <OrgSidebar
            org={org}
            mobileOpen={mobileOpen}
            onMobileClose={() => setMobileOpen(false)}
          />
          <main className="flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-7xl p-4 sm:p-6">{children}</div>
          </main>
        </div>
      </div>
    </OrgProvider>
  )
}
