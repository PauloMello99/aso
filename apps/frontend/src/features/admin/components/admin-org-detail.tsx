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
  Bell,
  Shield,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { cn } from "@/shared/lib/utils"
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
import {
  useAdminAuditLogs,
  useAdminOrgDetail,
  useAdminOrgNotifications,
  useSetOrgSuspended,
} from "../hooks/use-admin"
import { fmtDate } from "../lib/format"
import { ConfirmDialog } from "@/shared/components/ui/confirm-dialog"
import { OrgSubscriptionPanel } from "./org-subscription-panel"
import type {
  AdminOrgDetail as AdminOrgDetailData,
  AdminOrgMember,
  AuditAction,
} from "../types"

type TabId = "overview" | "subscription" | "members" | "notifications" | "audit"

const TABS: { id: TabId; label: string }[] = [
  { id: "overview", label: "Visão geral" },
  { id: "subscription", label: "Assinatura" },
  { id: "members", label: "Membros" },
  { id: "notifications", label: "Notificações" },
  { id: "audit", label: "Auditoria" },
]

export function AdminOrgDetail({ id }: { id: string | undefined }) {
  const { org, loading, error } = useAdminOrgDetail(id)
  const setSuspended = useSetOrgSuspended()

  const [tab, setTab] = React.useState<TabId>("overview")
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
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
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
              <Badge variant="destructive" className="bg-destructive/15 text-destructive">
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

      {tab === "overview" && <OverviewTab org={org} />}
      {tab === "subscription" && <OrgSubscriptionPanel org={org} />}
      {tab === "members" && <MembersTab org={org} />}
      {tab === "notifications" && (
        <NotificationsTab orgId={org.id} members={org.members} />
      )}
      {tab === "audit" && <AuditTab orgId={org.id} />}

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

function OverviewTab({ org }: { org: AdminOrgDetailData }) {
  return (
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
  )
}

function MembersTab({ org }: { org: AdminOrgDetailData }) {
  return (
    <div className="space-y-6">
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
                      className="font-medium text-foreground hover:text-primary"
                    >
                      {m.name}
                    </Link>
                    <span className="block text-xs text-foreground/40">{m.email}</span>
                  </TableCell>
                  <TableCell>
                    {m.role === "owner" ? (
                      <Badge className="bg-primary/15 text-primary">owner</Badge>
                    ) : (
                      <span className="text-foreground/60">{m.role}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {m.enabled ? (
                      <span className="text-foreground/60">ativo</span>
                    ) : (
                      <span className="text-destructive">inativo</span>
                    )}
                  </TableCell>
                  <TableCell className="text-foreground/50">{fmtDate(m.joinedAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

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
    </div>
  )
}

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function NotificationsTab({
  orgId,
  members,
}: {
  orgId: string
  members: AdminOrgMember[]
}) {
  const { notifications, loading, error } = useAdminOrgNotifications(orgId)

  const memberByUserId = React.useMemo(() => {
    const map = new Map<string, AdminOrgMember>()
    for (const m of members) map.set(m.userId, m)
    return map
  }, [members])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-foreground/30">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
        {error}
      </div>
    )
  }

  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-16 text-foreground/40">
        <Bell className="h-8 w-8" />
        <p className="text-sm">Nenhuma notificação registrada.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-foreground/[0.06]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Destinatário</TableHead>
            <TableHead>Título</TableHead>
            <TableHead>Data</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {notifications.map((n) => {
            const member = memberByUserId.get(n.userId)
            return (
              <TableRow key={n.id}>
                <TableCell>
                  {member ? (
                    <span className="text-sm font-medium text-foreground">
                      {member.name}
                    </span>
                  ) : (
                    <span className="font-mono text-xs text-foreground/40">
                      {n.userId.slice(0, 8)}…
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-foreground/80">{n.title}</TableCell>
                <TableCell className="whitespace-nowrap text-xs text-foreground/50">
                  {fmtDateTime(n.createdAt)}
                </TableCell>
                <TableCell>
                  {n.readAt === null ? (
                    <Badge className="bg-primary/15 text-primary">não lida</Badge>
                  ) : (
                    <span className="text-xs text-foreground/40">lida</span>
                  )}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  create: "Criação",
  update: "Atualização",
  delete: "Remoção",
  invite_sent: "Convite enviado",
  invite_accepted: "Convite aceito",
  subscription_changed: "Assinatura",
  cashier_transaction_created: "Caixa: lançamento",
  cashier_fees_updated: "Caixa: taxas",
  cashier_commissions_updated: "Caixa: comissões",
}

const AUDIT_ACTION_VARIANTS: Record<
  AuditAction,
  "default" | "secondary" | "destructive" | "outline"
> = {
  create: "default",
  update: "secondary",
  delete: "destructive",
  invite_sent: "outline",
  invite_accepted: "outline",
  subscription_changed: "secondary",
  cashier_transaction_created: "default",
  cashier_fees_updated: "secondary",
  cashier_commissions_updated: "secondary",
}

function AuditTab({ orgId }: { orgId: string }) {
  const [page, setPage] = React.useState(1)
  const { page: result, loading, error } = useAdminAuditLogs({
    page,
    limit: 50,
    orgId,
  })

  const currentPage = result?.page ?? 1
  const totalPages = result?.pages ?? 1

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-foreground/30">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
        {error}
      </div>
    )
  }

  if (!result || result.data.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-16 text-foreground/40">
        <Shield className="h-8 w-8" />
        <p className="text-sm">Nenhum registro de auditoria para esta organização.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-xl border border-foreground/[0.06]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="whitespace-nowrap">Data/Hora</TableHead>
              <TableHead>Ator</TableHead>
              <TableHead>Ação</TableHead>
              <TableHead>Entidade</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.data.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="whitespace-nowrap text-xs text-foreground/60">
                  {fmtDateTime(row.createdAt)}
                </TableCell>
                <TableCell>
                  {row.actor ? (
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{row.actor.name || "—"}</p>
                      <p className="truncate text-xs text-foreground/50">{row.actor.email}</p>
                    </div>
                  ) : (
                    <span className="text-xs text-foreground/40">sistema</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={AUDIT_ACTION_VARIANTS[row.action]} className="text-xs">
                    {AUDIT_ACTION_LABELS[row.action]}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm">
                  <span className="font-mono text-xs">{row.entityType}</span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-sm text-foreground/50">
        <span>
          {result.total} registro{result.total !== 1 ? "s" : ""}
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-7 w-7 p-0"
            disabled={currentPage <= 1}
            onClick={() => setPage(currentPage - 1)}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <span className="text-xs">
            {currentPage} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="h-7 w-7 p-0"
            disabled={currentPage >= totalPages}
            onClick={() => setPage(currentPage + 1)}
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
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
        <Icon className="h-3.5 w-3.5 text-primary" />
        {label}
      </div>
      <p className="mt-1.5 truncate text-lg font-semibold text-foreground">{value}</p>
      {sub && <p className="truncate text-xs text-foreground/40">{sub}</p>}
    </div>
  )
}
