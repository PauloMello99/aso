"use client"

import { useRouter } from "next/router"
import { Check, ChevronsUpDown, Building2 } from "lucide-react"
import { useOrgs } from "@/features/dashboard/hooks/use-orgs"
import type { OrgSummary } from "@/features/dashboard/hooks/use-orgs"
import { Button } from "@/shared/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu"

interface OrgSwitcherProps {
  org: OrgSummary
}

export function OrgSwitcher({ org }: OrgSwitcherProps) {
  const { orgs } = useOrgs()
  const router = useRouter()

  // Keep the same sub-path in the new org by replacing the slug in the query.
  const handleSelect = (slug: string) => {
    if (slug === org.slug) return
    void router.push({
      pathname: router.pathname, // e.g. /dashboard/org/[orgSlug]/members
      query: { ...router.query, orgSlug: slug },
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-auto gap-1.5 px-2 py-1 text-sm font-medium text-foreground hover:bg-foreground/[0.06]"
        >
          {org.name}
          <ChevronsUpDown className="h-3.5 w-3.5 text-foreground/40" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[200px]">
        <DropdownMenuLabel className="text-[10px] uppercase tracking-widest">
          Organizações
        </DropdownMenuLabel>
        {orgs.map((o) => (
          <DropdownMenuItem key={o.id} onClick={() => handleSelect(o.slug)}>
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-orange-500/20 text-[10px] font-bold text-orange-400">
              {o.name.charAt(0).toUpperCase()}
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5 overflow-hidden">
              <span className="truncate">{o.name}</span>
              <span className="text-[10px] text-foreground/30">
                {o.role === "owner" ? "Proprietário" : "Funcionário"}
              </span>
            </span>
            {o.id === org.id && (
              <Check className="h-3.5 w-3.5 shrink-0 text-orange-400" />
            )}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => void router.push("/dashboard/organizations")}
        >
          <Building2 className="h-3.5 w-3.5 shrink-0 text-foreground/40" />
          <span className="flex-1">Ver todas as organizações</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
