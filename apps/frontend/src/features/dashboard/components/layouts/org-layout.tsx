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
import { useSubscription } from "@/features/billing/hooks/use-subscription"
import {
  isSubscriptionLocked,
  isSubscriptionPastDue,
  LockedBanner,
  PastDueBanner,
} from "@/features/billing"
import type { OrgSummary } from "@/features/dashboard/hooks/use-orgs"
import type { BreadcrumbItem } from "@/features/dashboard/components/top-header"

interface OrgLayoutProps {
  children: React.ReactNode
}

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

  const isSuper = me?.platformRole === "super_admin"
  const tryResolve = !!orgSlug && !loading && !listOrg && isSuper
  const {
    org: resolvedOrg,
    loading: resolving,
    notFound,
  } = useResolveOrgBySlug(orgSlug, tryResolve)

  const org: OrgSummary | undefined = React.useMemo(() => {
    const base = listOrg ?? resolvedOrg ?? undefined
    if (base && isSuper && base.role !== "owner") {
      return { ...base, role: "owner" as const }
    }
    return base
  }, [listOrg, resolvedOrg, isSuper])

  const isRealOwner = listOrg?.role === "owner"
  const actingAsAdmin = isSuper && !isRealOwner
  const superOwner = isSuper && isRealOwner

  const {
    subscription,
    loading: subLoading,
    notFound: subNotFound,
    error: subError,
  } = useSubscription(org?.id ?? "")
  // A 404 (no subscription row) is a genuine "locked" state. Any other error
  // (network/5xx) is transient/unknown and must not flash the destructive
  // locked banner org-wide while it resolves.
  const subUnknown = !!subError && !subNotFound
  const locked =
    !subLoading && !subUnknown && (subNotFound || isSubscriptionLocked(subscription))
  const pastDue =
    !subLoading && !subUnknown && !locked && isSubscriptionPastDue(subscription)

  React.useEffect(() => {
    if (!orgSlug || loading || listOrg) return
    if (!isSuper || (!resolving && notFound)) {
      void router.replace("/dashboard/organizations")
    }
  }, [orgSlug, loading, listOrg, isSuper, resolving, notFound, router])

  const currentSubpath = router.pathname.split("/[orgSlug]/")[1] ?? ""
  React.useEffect(() => {
    if (!org || org.role === "owner") return
    const seg = currentSubpath.split("/")[0] ?? ""
    const lacksModule =
      isModuleKey(seg) && !canAccessModule(org.role, org.permissions, seg)
    if (isOwnerOnlyPath(currentSubpath) || lacksModule) {
      void router.replace(`/dashboard/org/${org.slug}/overview`)
    }
  }, [org, currentSubpath, router])

  React.useEffect(() => {
    setMobileOpen(false)
  }, [router.pathname])

  useOnboardingTour({ me, org, setMobileOpen })

  if (!org) return null

  const orgSwitcher = <OrgSwitcher org={org} />
  const breadcrumbs = buildOrgCrumbs(router.pathname, org.slug, orgSwitcher)

  return (
    <OrgProvider
      org={org}
      actingAsAdmin={actingAsAdmin}
      subscriptionLocked={locked}
      subscriptionPastDue={pastDue}
    >
      <div className="flex h-screen overflow-hidden bg-background">
        <OrgSidebar
          org={org}
          mobileOpen={mobileOpen}
          onMobileClose={() => setMobileOpen(false)}
        />
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {actingAsAdmin ? (
            <div className="flex shrink-0 items-center justify-center gap-2 bg-primary/15 px-4 py-1.5 text-center text-xs text-primary/80 sm:text-sm">
              <ShieldAlert className="h-4 w-4 shrink-0" />
              <span>
                Você está gerenciando{" "}
                <strong className="font-semibold">{org.name}</strong> como
                super_admin.
              </span>
              <Link
                href={`/admin/orgs/${org.id}`}
                className="shrink-0 font-medium underline underline-offset-2 hover:text-primary/90"
              >
                Voltar ao painel
              </Link>
            </div>
          ) : superOwner ? (
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
          {locked ? (
            <div className="px-4 pt-4 sm:px-6">
              <LockedBanner
                isOwner={org.role === "owner"}
                subscriptionHref={`/dashboard/org/${org.slug}/settings/subscription`}
              />
            </div>
          ) : pastDue ? (
            <div className="px-4 pt-4 sm:px-6">
              <PastDueBanner
                isOwner={org.role === "owner"}
                subscriptionHref={`/dashboard/org/${org.slug}/settings/subscription`}
              />
            </div>
          ) : null}
          <TopHeader
            breadcrumbs={breadcrumbs}
            onMobileMenuToggle={() => setMobileOpen((v) => !v)}
          />
          <main className="flex-1 overflow-y-auto">
            <div className="mx-auto w-full max-w-7xl p-4 sm:p-6">{children}</div>
          </main>
        </div>
      </div>
    </OrgProvider>
  )
}
