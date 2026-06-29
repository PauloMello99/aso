"use client"

import * as React from "react"
import type { OrgSummary } from "@/features/dashboard/hooks/use-orgs"

interface OrgContextValue {
  /** The resolved organization (from the URL slug). */
  org: OrgSummary
  /** The organization UUID — use this for API calls (`/orgs/:orgId/...`). */
  orgId: string
  /** True quando um super_admin gerencia uma org da qual NÃO é membro. */
  actingAsAdmin: boolean
}

const OrgContext = React.createContext<OrgContextValue | null>(null)

export function OrgProvider({
  org,
  actingAsAdmin = false,
  children,
}: {
  org: OrgSummary
  actingAsAdmin?: boolean
  children: React.ReactNode
}) {
  const value = React.useMemo(
    () => ({ org, orgId: org.id, actingAsAdmin }),
    [org, actingAsAdmin],
  )
  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>
}

/** Access the current org (UUID + summary), resolved from the URL slug by OrgLayout. */
export function useCurrentOrg(): OrgContextValue {
  const ctx = React.useContext(OrgContext)
  if (!ctx) {
    throw new Error("useCurrentOrg must be used within an OrgProvider (OrgLayout)")
  }
  return ctx
}
