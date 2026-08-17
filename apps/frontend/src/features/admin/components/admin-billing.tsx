"use client"

import * as React from "react"
import { cn } from "@/shared/lib/utils"
import { BillingPlansPanel } from "./billing-plans-panel"
import { BillingCouponsPanel } from "./billing-coupons-panel"

type TabId = "plans" | "coupons"

const TABS: { id: TabId; label: string }[] = [
  { id: "plans", label: "Planos" },
  { id: "coupons", label: "Cupons" },
]

export function AdminBilling() {
  const [tab, setTab] = React.useState<TabId>("plans")

  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold">Billing</h1>

      <nav className="flex gap-1 overflow-x-auto border-b border-foreground/[0.06] pb-px">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "shrink-0 whitespace-nowrap rounded-t-md border-b-2 px-3 py-2 text-sm transition-colors",
              tab === t.id
                ? "border-primary text-foreground"
                : "border-transparent text-foreground/50 hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === "plans" && <BillingPlansPanel />}
      {tab === "coupons" && <BillingCouponsPanel />}
    </div>
  )
}
