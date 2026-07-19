"use client"

import * as React from "react"
import { useRouter } from "next/router"
import { RefreshCw, Ban, RotateCcw, Search, Building2 } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { Badge } from "@/shared/components/ui/badge"
import { Input } from "@/shared/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table"
import { useAdminOrgs } from "../hooks/use-admin"
import { fmtDate } from "../lib/format"
import { useDebouncedValue } from "../lib/use-debounced-value"
import { ConfirmDialog } from "./confirm-dialog"
import { SortHead } from "./sort-head"
import type { AdminOrg, OrgSortKey, OrgStatusFilter, SortDir } from "../types"

const STATUS_TABS: { value: OrgStatusFilter; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "active", label: "Ativas" },
  { value: "suspended", label: "Suspensas" },
]

export function AdminOrgs() {
  const router = useRouter()
  const { orgs, loading, error, refetch, setSuspended } = useAdminOrgs()

  const [query, setQuery] = React.useState("")
  const debouncedQuery = useDebouncedValue(query)
  const [status, setStatus] = React.useState<OrgStatusFilter>("all")
  const [sortKey, setSortKey] = React.useState<OrgSortKey>("createdAt")
  const [sortDir, setSortDir] = React.useState<SortDir>("desc")

  const [target, setTarget] = React.useState<AdminOrg | null>(null)
  const [busy, setBusy] = React.useState(false)
  const [actionError, setActionError] = React.useState<string | null>(null)

  const rows = React.useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase()
    const filtered = orgs.filter((o) => {
      const suspended = o.suspendedAt !== null
      if (status === "active" && suspended) return false
      if (status === "suspended" && !suspended) return false
      if (!q) return true
      return (
        o.name.toLowerCase().includes(q) ||
        o.slug.toLowerCase().includes(q) ||
        (o.ownerName ?? "").toLowerCase().includes(q)
      )
    })
    const dir = sortDir === "asc" ? 1 : -1
    return [...filtered].sort((a, b) => {
      if (sortKey === "name") return a.name.localeCompare(b.name) * dir
      if (sortKey === "memberCount") return (a.memberCount - b.memberCount) * dir
      return (
        (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * dir
      )
    })
  }, [orgs, debouncedQuery, status, sortKey, sortDir])

  function toggleSort(key: OrgSortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortKey(key)
      setSortDir(key === "name" ? "asc" : "desc")
    }
  }

  async function confirmToggle() {
    if (!target) return
    setBusy(true)
    setActionError(null)
    try {
      await setSuspended(target.id, target.suspendedAt === null)
      setTarget(null)
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Não foi possível atualizar.",
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Organizações</h1>
          <p className="mt-0.5 text-sm text-foreground/40">
            {orgs.length} na plataforma · {rows.length} exibidas
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => void refetch()}
          disabled={loading}
          title="Atualizar"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/30" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nome, slug ou dono…"
            className="pl-9"
          />
        </div>
        <div className="flex shrink-0 rounded-md border border-foreground/[0.08] p-0.5">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setStatus(tab.value)}
              className={`rounded px-3 py-1.5 text-sm transition-colors ${
                status === tab.value
                  ? "bg-foreground/[0.08] text-foreground"
                  : "text-foreground/50 hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-foreground/[0.06]">
        <Table>
          <TableHeader>
            <TableRow>
              <SortHead label="Organização" active={sortKey === "name"} dir={sortDir} onClick={() => toggleSort("name")} />
              <TableHead>Dono</TableHead>
              <SortHead label="Membros" active={sortKey === "memberCount"} dir={sortDir} onClick={() => toggleSort("memberCount")} align="right" />
              <SortHead label="Criada" active={sortKey === "createdAt"} dir={sortDir} onClick={() => toggleSort("createdAt")} />
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((o) => {
              const suspended = o.suspendedAt !== null
              return (
                <TableRow
                  key={o.id}
                  onClick={() => void router.push(`/admin/orgs/${o.id}`)}
                  className="cursor-pointer"
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">{o.name}</span>
                      {suspended && (
                        <Badge variant="destructive" className="bg-destructive/15 text-destructive">
                          Suspensa
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-foreground/40">/{o.slug}</span>
                  </TableCell>
                  <TableCell className="text-foreground/70">
                    {o.ownerName ?? "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-foreground/70">
                    {o.memberCount}
                  </TableCell>
                  <TableCell className="text-foreground/50">
                    {fmtDate(o.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant={suspended ? "outline" : "ghost"}
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        setActionError(null)
                        setTarget(o)
                      }}
                      className={suspended ? "" : "text-destructive hover:text-destructive/80"}
                    >
                      {suspended ? (
                        <>
                          <RotateCcw className="h-4 w-4" />
                          <span className="hidden sm:inline">Reativar</span>
                        </>
                      ) : (
                        <>
                          <Ban className="h-4 w-4" />
                          <span className="hidden sm:inline">Suspender</span>
                        </>
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>

        {!loading && rows.length === 0 && (
          <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
            <Building2 className="h-6 w-6 text-foreground/20" />
            <p className="text-sm text-foreground/50">
              {orgs.length === 0
                ? "Nenhuma organização ainda."
                : "Nenhuma organização corresponde à busca."}
            </p>
          </div>
        )}
        {loading && (
          <div className="space-y-px">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse bg-foreground/[0.02]" />
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={target !== null}
        onOpenChange={(o) => !o && setTarget(null)}
        title={
          target?.suspendedAt
            ? `Reativar "${target.name}"?`
            : `Suspender "${target?.name}"?`
        }
        description={
          target?.suspendedAt
            ? "A organização volta a ter acesso à plataforma."
            : "Os membros perdem acesso até a reativação."
        }
        confirmLabel={target?.suspendedAt ? "Reativar" : "Suspender"}
        destructive={!target?.suspendedAt}
        loading={busy}
        error={actionError}
        onConfirm={() => void confirmToggle()}
      />
    </div>
  )
}
