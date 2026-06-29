"use client"

import * as React from "react"
import Link from "next/link"
import {
  ArrowLeft,
  Ban,
  RotateCcw,
  Users,
  Crown,
  Mail,
  Loader2,
  ExternalLink,
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
import { useAdminOrgDetail, useSetOrgSuspended } from "../hooks/use-admin"
import { fmtDate } from "../lib/format"
import { ConfirmDialog } from "./confirm-dialog"

export function AdminOrgDetail({ id }: { id: string | undefined }) {
  const { org, loading, error } = useAdminOrgDetail(id)
  const setSuspended = useSetOrgSuspended()

  const [confirming, setConfirming] = React.useState(false)
  const [busy, setBusy] = React.useState(false)
  const [actionError, setActionError] = React.useState<string | null>(null)

  async function confirmToggle() {
    if (!org) return
    setBusy(true)
    setActionError(null)
    try {
      await setSuspended(org.id, org.suspendedAt === null)
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

  if (error || !org) {
    return (
      <div className="space-y-4">
        <BackLink />
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
          {error ?? "Organização não encontrada."}
        </div>
      </div>
    )
  }

  const suspended = org.suspendedAt !== null

  return (
    <div className="space-y-6">
      <BackLink />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-xl font-semibold text-foreground">
              {org.name}
            </h1>
            {suspended && (
              <Badge variant="destructive" className="bg-red-500/15 text-red-400">
                Suspensa
              </Badge>
            )}
          </div>
          <p className="mt-0.5 text-sm text-foreground/40">
            /{org.slug} · criada em {fmtDate(org.createdAt)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button asChild variant="default">
            <Link href={`/dashboard/org/${org.slug}`}>
              <ExternalLink className="h-4 w-4" /> Gerenciar
            </Link>
          </Button>
          <Button
            variant={suspended ? "outline" : "destructive"}
            onClick={() => {
              setActionError(null)
              setConfirming(true)
            }}
          >
            {suspended ? (
              <>
                <RotateCcw className="h-4 w-4" /> Reativar
              </>
            ) : (
              <>
                <Ban className="h-4 w-4" /> Suspender
              </>
            )}
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <InfoCard icon={Users} label="Membros" value={String(org.memberCount)} />
        <InfoCard
          icon={Crown}
          label="Dono"
          value={org.owner?.name ?? "—"}
          sub={org.owner?.email}
        />
        <InfoCard
          icon={Mail}
          label="Convites pendentes"
          value={String(org.pendingInvitations.length)}
        />
      </div>

      {/* Membros */}
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-foreground">Membros</h2>
        <div className="overflow-hidden rounded-xl border border-foreground/[0.06]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Papel</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Entrou</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {org.members.map((m) => (
                <TableRow key={m.userId}>
                  <TableCell>
                    <Link
                      href={`/admin/users/${m.userId}`}
                      className="font-medium text-foreground hover:text-orange-400"
                    >
                      {m.name}
                    </Link>
                    <span className="block text-xs text-foreground/40">{m.email}</span>
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
      </section>

      {/* Convites pendentes */}
      {org.pendingInvitations.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-foreground">Convites pendentes</h2>
          <div className="overflow-hidden rounded-xl border border-foreground/[0.06]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Papel</TableHead>
                  <TableHead>Enviado</TableHead>
                  <TableHead>Expira</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {org.pendingInvitations.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="text-foreground/80">{inv.email}</TableCell>
                    <TableCell className="text-foreground/60">{inv.role}</TableCell>
                    <TableCell className="text-foreground/50">{fmtDate(inv.createdAt)}</TableCell>
                    <TableCell className="text-foreground/50">{fmtDate(inv.expiresAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      )}

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={suspended ? `Reativar "${org.name}"?` : `Suspender "${org.name}"?`}
        description={
          suspended
            ? "A organização volta a ter acesso à plataforma."
            : "Os membros perdem acesso até a reativação."
        }
        confirmLabel={suspended ? "Reativar" : "Suspender"}
        destructive={!suspended}
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
      href="/admin/orgs"
      className="inline-flex items-center gap-1.5 text-sm text-foreground/50 transition-colors hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" /> Organizações
    </Link>
  )
}

function InfoCard({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: typeof Users
  label: string
  value: string
  sub?: string
}) {
  return (
    <div className="rounded-xl border border-foreground/[0.06] bg-foreground/[0.02] p-4">
      <div className="flex items-center gap-1.5 text-xs text-foreground/50">
        <Icon className="h-3.5 w-3.5 text-orange-400" />
        {label}
      </div>
      <p className="mt-1.5 truncate text-lg font-semibold text-foreground">{value}</p>
      {sub && <p className="truncate text-xs text-foreground/40">{sub}</p>}
    </div>
  )
}
