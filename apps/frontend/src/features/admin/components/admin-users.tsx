"use client"

import * as React from "react"
import { RefreshCw, ShieldCheck, ShieldOff } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { Badge } from "@/shared/components/ui/badge"
import { useMe } from "@/features/auth/hooks/use-me"
import { useAdminUsers } from "../hooks/use-admin"
import type { PlatformRole } from "../types"

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

export function AdminUsers() {
  const { me } = useMe()
  const { users, loading, error, refetch, setPlatformRole } = useAdminUsers()
  const [busyId, setBusyId] = React.useState<string | null>(null)

  async function toggleRole(id: string, name: string, current: PlatformRole) {
    const next: PlatformRole = current === "super_admin" ? "user" : "super_admin"
    const verb = next === "super_admin" ? "promover a super_admin" : "rebaixar para usuário"
    if (!confirm(`Deseja ${verb} "${name}"?`)) return
    setBusyId(id)
    try {
      await setPlatformRole(id, next)
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
          <h1 className="text-xl font-semibold text-foreground">Usuários</h1>
          <p className="mt-0.5 text-sm text-foreground/40">
            {users.length} usuários na plataforma.
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
          {users.map((u) => {
            const isSuper = u.platformRole === "super_admin"
            const isSelf = me?.id === u.id
            return (
              <li
                key={u.id}
                className="flex items-center gap-3 px-4 py-3 text-sm"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-medium text-foreground">
                      {u.name}
                    </p>
                    {isSuper && (
                      <Badge className="bg-orange-500/15 text-orange-400">
                        super_admin
                      </Badge>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-foreground/40">
                    {u.email} · {u.orgCount}{" "}
                    {u.orgCount === 1 ? "org" : "orgs"} · {fmtDate(u.createdAt)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={busyId === u.id || isSelf}
                  title={isSelf ? "Você não pode alterar o próprio papel" : undefined}
                  onClick={() => void toggleRole(u.id, u.name, u.platformRole)}
                  className={isSuper ? "text-foreground/60" : "text-orange-400 hover:text-orange-300"}
                >
                  {isSuper ? (
                    <>
                      <ShieldOff className="h-4 w-4" />
                      <span className="hidden sm:inline">Rebaixar</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="h-4 w-4" />
                      <span className="hidden sm:inline">Promover</span>
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
