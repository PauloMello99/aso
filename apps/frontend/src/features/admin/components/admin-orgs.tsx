"use client"

import * as React from "react"
import { RefreshCw, Ban, RotateCcw } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { Badge } from "@/shared/components/ui/badge"
import { useAdminOrgs } from "../hooks/use-admin"

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

export function AdminOrgs() {
  const { orgs, loading, error, refetch, setSuspended } = useAdminOrgs()
  const [busyId, setBusyId] = React.useState<string | null>(null)

  async function toggleSuspend(id: string, name: string, suspended: boolean) {
    const verb = suspended ? "reativar" : "suspender"
    if (!confirm(`Deseja ${verb} a organização "${name}"?`)) return
    setBusyId(id)
    try {
      await setSuspended(id, !suspended)
    } catch (err) {
      alert(err instanceof Error ? err.message : "Não foi possível atualizar.")
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Organizações</h1>
          <p className="mt-0.5 text-sm text-foreground/40">
            {orgs.length} organizações na plataforma.
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
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-foreground/[0.06]">
        <ul className="divide-y divide-foreground/[0.05]">
          {orgs.map((o) => {
            const suspended = o.suspendedAt !== null
            return (
              <li
                key={o.id}
                className="flex items-center gap-3 px-4 py-3 text-sm"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium text-foreground">
                      {o.name}
                    </p>
                    {suspended && (
                      <Badge
                        variant="destructive"
                        className="bg-red-500/15 text-red-400"
                      >
                        Suspensa
                      </Badge>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-foreground/40">
                    {o.ownerName ?? "sem dono"} · {o.memberCount}{" "}
                    {o.memberCount === 1 ? "membro" : "membros"} ·{" "}
                    {fmtDate(o.createdAt)}
                  </p>
                </div>
                <Button
                  variant={suspended ? "outline" : "ghost"}
                  size="sm"
                  disabled={busyId === o.id}
                  onClick={() => void toggleSuspend(o.id, o.name, suspended)}
                  className={suspended ? "" : "text-red-400 hover:text-red-300"}
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
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
