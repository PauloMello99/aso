"use client"

import * as React from "react"
import { useRouter } from "next/router"
import { TopHeader } from "@/features/dashboard/components/top-header"
import { OrgSidebar } from "@/features/dashboard/components/org-sidebar"
import { OrgSwitcher } from "@/features/dashboard/components/org-switcher"
import { OrgProvider } from "@/features/dashboard/components/org-context"
import { useOrgs } from "@/features/dashboard/hooks/use-orgs"
import { PAGE_LABELS, isOwnerOnlyPath } from "@/features/dashboard/lib/nav"
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

  const { orgs, loading } = useOrgs()
  const org: OrgSummary | undefined = orgs.find((o) => o.slug === orgSlug)

  // Slug doesn't match any of the user's orgs → back to the org list.
  React.useEffect(() => {
    if (orgSlug && !loading && !org) {
      void router.replace("/dashboard/organizations")
    }
  }, [orgSlug, loading, org, router])

  // Funcionário tentando acessar rota owner-only direto pela URL → manda p/ overview.
  // O backend já barra com 403; isto evita renderizar a casca de uma página proibida.
  // settings/agenda fica de fora (funcionário configura a própria agenda).
  const currentSubpath = router.pathname.split("/[orgSlug]/")[1] ?? ""
  React.useEffect(() => {
    if (org && org.role !== "owner" && isOwnerOnlyPath(currentSubpath)) {
      void router.replace(`/dashboard/org/${org.slug}/overview`)
    }
  }, [org, currentSubpath, router])

  // Close mobile sidebar on navigation
  React.useEffect(() => {
    setMobileOpen(false)
  }, [router.pathname])

  if (!org) return null

  const orgSwitcher = <OrgSwitcher org={org} />
  const breadcrumbs = buildOrgCrumbs(router.pathname, org.slug, orgSwitcher)

  return (
    <OrgProvider org={org}>
      <div className="flex h-screen flex-col overflow-hidden bg-background">
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
