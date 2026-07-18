"use client"

import * as React from "react"
import Link from "next/link"
import {
  ArrowLeft,
  ShieldCheck,
  ShieldOff,
  Building2,
  Phone,
  Loader2,
} from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { Badge } from "@/shared/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table"
import { useMe } from "@/features/auth/hooks/use-me"
import { useAdminUserDetail, useSetUserPlatformRole } from "../hooks/use-admin"
import { fmtDate } from "../lib/format"
import { ConfirmDialog } from "./confirm-dialog"

export function AdminUserDetail({ id }: { id: string | undefined }) {
  const { me } = useMe()
  const { user, loading, error } = useAdminUserDetail(id)
  const setPlatformRole = useSetUserPlatformRole()

  const [confirming, setConfirming] = React.useState(false)
  const [busy, setBusy] = React.useState(false)
  const [actionError, setActionError] = React.useState<string | null>(null)

  async function confirmToggle() {
    if (!user) return
    const next = user.platformRole === "super_admin" ? "user" : "super_admin"
    setBusy(true)
    setActionError(null)
    try {
      await setPlatformRole(user.id, next)
      setConfirming(false)
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Falha ao atualizar.")
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-foreground/30">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    )
  }

  if (error || !user) {
    return (
      <div className="space-y-4">
        <BackLink />
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
          {error ?? "Usuário não encontrado."}
        </div>
      </div>
    )
  }

  const isSuper = user.platformRole === "super_admin"
  const isSelf = me?.id === user.id

  return (
    <div className="space-y-6">
      <BackLink />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-xl font-semibold text-foreground">
              {user.name}
            </h1>
            {isSuper && (
              <Badge className="bg-orange-500/15 text-orange-400">super_admin</Badge>
            )}
          </div>
          <p className="mt-0.5 text-sm text-foreground/40">
            {user.email} · desde {fmtDate(user.createdAt)}
          </p>
          {user.phone && (
            <p className="mt-0.5 flex items-center gap-1.5 text-sm text-foreground/40">
              <Phone className="h-3.5 w-3.5" /> {user.phone}
            </p>
          )}
        </div>
        <Button
          variant={isSuper ? "outline" : "default"}
          disabled={isSelf}
          title={isSelf ? "Você não pode alterar o próprio papel" : undefined}
          onClick={() => {
            setActionError(null)
            setConfirming(true)
          }}
          className="shrink-0"
        >
          {isSuper ? (
            <>
              <ShieldOff className="h-4 w-4" /> Rebaixar
            </>
          ) : (
            <>
              <ShieldCheck className="h-4 w-4" /> Promover a super_admin
            </>
          )}
        </Button>
      </div>

      <section className="space-y-3">
        <h2 className="flex items-center gap-1.5 text-sm font-medium text-foreground">
          <Building2 className="h-4 w-4 text-orange-400" />
          Organizações ({user.memberships.length})
        </h2>
        {user.memberships.length === 0 ? (
          <p className="rounded-xl border border-foreground/[0.06] bg-foreground/[0.02] px-4 py-8 text-center text-sm text-foreground/40">
            Este usuário não pertence a nenhuma organização.
          </p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-foreground/[0.06]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organização</TableHead>
                  <TableHead>Papel</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Entrou</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {user.memberships.map((m) => (
                  <TableRow key={m.orgId}>
                    <TableCell>
                      <Link
                        href={`/admin/orgs/${m.orgId}`}
                        className="font-medium text-foreground hover:text-orange-400"
                      >
                        {m.orgName}
                      </Link>
                      <span className="block text-xs text-foreground/40">/{m.orgSlug}</span>
                    </TableCell>
                    <TableCell>
                      {m.role === "owner" ? (
                        <Badge className="bg-orange-500/15 text-orange-400">owner</Badge>
                      ) : (
                        <span className="text-foreground/60">{m.role}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {m.enabled ? (
                        <span className="text-foreground/60">ativo</span>
                      ) : (
                        <span className="text-red-400">inativo</span>
                      )}
                    </TableCell>
                    <TableCell className="text-foreground/50">{fmtDate(m.joinedAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={
          isSuper
            ? `Rebaixar "${user.name}" para usuário?`
            : `Promover "${user.name}" a super_admin?`
        }
        description={
          isSuper
            ? "O usuário perde acesso ao painel da plataforma."
            : "O usuário passa a ter poder total sobre todas as organizações."
        }
        confirmLabel={isSuper ? "Rebaixar" : "Promover"}
        destructive={isSuper}
        loading={busy}
        error={actionError}
        onConfirm={() => void confirmToggle()}
      />
    </div>
  )
}

function BackLink() {
  return (
    <Link
      href="/admin/users"
      className="inline-flex items-center gap-1.5 text-sm text-foreground/50 transition-colors hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" /> Usuários
    </Link>
  )
}
