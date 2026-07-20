"use client"

import * as React from "react"
import type { OrgSummary } from "@/features/dashboard/hooks/use-orgs"

interface OrgContextValue {
  org: OrgSummary
  orgId: string
  actingAsAdmin: boolean
  subscriptionLocked: boolean
  subscriptionPastDue: boolean
}

const OrgContext = React.createContext<OrgContextValue | null>(null)

export function OrgProvider({
  org,
  actingAsAdmin = false,
  subscriptionLocked = false,
  subscriptionPastDue = false,
  children,
}: {
  org: OrgSummary
  actingAsAdmin?: boolean
  subscriptionLocked?: boolean
  subscriptionPastDue?: boolean
  children: React.ReactNode
}) {
  const value = React.useMemo(
    () => ({
      org,
      orgId: org.id,
      actingAsAdmin,
      subscriptionLocked,
      subscriptionPastDue,
    }),
    [org, actingAsAdmin, subscriptionLocked, subscriptionPastDue],
  )
  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>
}

export function useCurrentOrg(): OrgContextValue {
  const ctx = React.useContext(OrgContext)
  if (!ctx) {
    throw new Error("useCurrentOrg must be used within an OrgProvider (OrgLayout)")
  }
  return ctx
}
