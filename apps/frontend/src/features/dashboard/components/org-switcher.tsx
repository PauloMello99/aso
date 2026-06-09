"use client"

import * as React from "react"
import { useRouter } from "next/router"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/shared/lib/utils"
import { useOrgs } from "@/features/dashboard/hooks/use-orgs"
import type { OrgSummary } from "@/features/dashboard/hooks/use-orgs"

interface OrgSwitcherProps {
  org: OrgSummary
}

export function OrgSwitcher({ org }: OrgSwitcherProps) {
  const { orgs } = useOrgs()
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)

  // Close on outside click
  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const handleSelect = (newOrgId: string) => {
    setOpen(false)
    if (newOrgId === org.id) return
    // Keep the same page/sub-path in the new org by replacing orgId in the query
    void router.push({
      pathname: router.pathname, // e.g. /dashboard/org/[orgId]/members
      query: { ...router.query, orgId: newOrgId },
    })
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-medium transition-colors",
          "text-white hover:bg-white/[0.06]",
        )}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        {org.name}
        <ChevronsUpDown className="h-3.5 w-3.5 text-white/40" />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute left-0 top-full z-50 mt-1.5 min-w-[180px] rounded-lg border border-white/10 bg-[#1a1a1d] py-1 shadow-xl"
        >
          <p className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-white/30">
            Organizações
          </p>
          {orgs.map((o) => (
            <button
              key={o.id}
              role="option"
              aria-selected={o.id === org.id}
              onClick={() => handleSelect(o.id)}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-white/70 transition-colors hover:bg-white/[0.06] hover:text-white"
            >
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-orange-500/20 text-[10px] font-bold text-orange-400">
                {o.name.charAt(0).toUpperCase()}
              </span>
              <span className="flex-1 truncate text-left">{o.name}</span>
              {o.id === org.id && (
                <Check className="h-3.5 w-3.5 shrink-0 text-orange-400" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
