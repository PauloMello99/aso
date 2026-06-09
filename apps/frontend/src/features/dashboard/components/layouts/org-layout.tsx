"use client"

import * as React from "react"
import { useRouter } from "next/router"
import { TopHeader } from "@/features/dashboard/components/top-header"
import { OrgSidebar } from "@/features/dashboard/components/org-sidebar"
import { OrgSwitcher } from "@/features/dashboard/components/org-switcher"
import { useOrg } from "@/features/dashboard/hooks/use-orgs"
import { PAGE_LABELS } from "@/features/dashboard/lib/nav"
import type { BreadcrumbItem } from "@/features/dashboard/components/top-header"

interface OrgLayoutProps {
  children: React.ReactNode
}

/**
 * Builds breadcrumb items for org pages, including settings sub-pages.
 *
 * /dashboard/org/[orgId]/overview          → [OrgSwitcher, "Overview"]
 * /dashboard/org/[orgId]/settings/billing  → [OrgSwitcher, "Configurações", "Cobrança"]
 */
function buildOrgCrumbs(
  pathname: string,
  orgId: string,
  orgSwitcher: React.ReactNode,
): BreadcrumbItem[] {
  const crumbs: BreadcrumbItem[] = [{ label: "Org", node: orgSwitcher }]

  const afterOrg = pathname.split("/[orgId]/")[1] ?? ""
  const segments = afterOrg.split("/").filter(Boolean)

  if (segments[0] === "settings") {
    crumbs.push({
      label: "Configurações",
      href: `/dashboard/org/${orgId}/settings`,
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
  const { orgId } = router.query as { orgId?: string }
  const [mobileOpen, setMobileOpen] = React.useState(false)

  const { org, notFound } = useOrg(orgId ?? "")

  // Redirect if org not found
  React.useEffect(() => {
    if (orgId && notFound) void router.replace("/dashboard/organizations")
  }, [orgId, notFound, router])

  // Close mobile sidebar on navigation
  React.useEffect(() => {
    setMobileOpen(false)
  }, [router.pathname])

  if (!org) return null

  const orgSwitcher = <OrgSwitcher org={org} />
  const breadcrumbs = buildOrgCrumbs(router.pathname, org.id, orgSwitcher)

  return (
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
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
      </div>
    </div>
  )
}
