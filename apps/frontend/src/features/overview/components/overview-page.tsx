"use client"

import * as React from "react"
import Link from "next/link"
import {
  Package,
  Wallet,
  Archive,
  CalendarDays,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  type LucideIcon,
} from "lucide-react"
import { cn } from "@/shared/lib/utils"
import { Badge } from "@/shared/components/ui/badge"
import { useCurrentOrg } from "@/features/dashboard"
import { useServices } from "@/features/services/hooks/use-services"
import { useTransactions } from "@/features/cashier/hooks/use-transactions"
import { useTransactionCategories } from "@/features/cashier/hooks/use-transaction-categories"
import { useMaterials } from "@/features/stock/hooks/use-materials"
import { useCalendarEvents } from "@/features/agenda/hooks/use-calendar-events"
import { useCustomers } from "@/features/clients/hooks/use-customers"
import { formatBRL } from "@/features/cashier/lib/money"
import {
  serviceStatus,
  SERVICE_STATUS_LABELS,
  type ServiceStatus,
} from "@/features/services/types"
import { TRANSACTION_TYPE_LABELS } from "@/features/cashier/types"

/* ── helpers ─────────────────────────────────────────────────────── */

const DAY_MS = 24 * 60 * 60 * 1000

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  })
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

const STATUS_VARIANT: Record<ServiceStatus, string> = {
  paid: "bg-emerald-500/15 text-emerald-400",
  pending: "bg-amber-500/15 text-amber-300",
  canceled: "bg-white/[0.06] text-white/40 line-through",
}

function SectionCard({
  title,
  icon: Icon,
  href,
  className,
  children,
}: {
  title: string
  icon: LucideIcon
  href?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div
      className={cn(
        "flex flex-col rounded-xl border border-white/[0.06] bg-white/[0.02] p-5",
        className,
      )}
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-orange-400" />
          <h2 className="text-sm font-semibold text-white">{title}</h2>
        </div>
        {href && (
          <Link
            href={href}
            className="text-xs text-white/40 transition-colors hover:text-white"
          >
            Ver todos
          </Link>
        )}
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="py-8 text-center text-sm text-white/30">{children}</p>
  )
}

function Loading() {
  return (
    <div className="flex items-center justify-center py-8 text-white/30">
      <Loader2 className="h-4 w-4 animate-spin" />
    </div>
  )
}

function Rows({ children }: { children: React.ReactNode }) {
  return <ul className="divide-y divide-white/[0.05]">{children}</ul>
}

/* ── Serviços recentes ───────────────────────────────────────────── */

function RecentServicesSection({
  orgId,
  basePath,
  showProfessional,
}: {
  orgId: string
  basePath: string
  showProfessional: boolean
}) {
  const { services, loading } = useServices(orgId)
  const recent = React.useMemo(
    () =>
      [...services]
        .sort((a, b) => +new Date(b.performedAt) - +new Date(a.performedAt))
        .slice(0, 10),
    [services],
  )

  return (
    <SectionCard
      title="Serviços recentes"
      icon={Package}
      href={`${basePath}/services`}
      className="lg:col-span-2"
    >
      {loading ? (
        <Loading />
      ) : recent.length === 0 ? (
        <Empty>Nenhum serviço realizado ainda.</Empty>
      ) : (
        <Rows>
          {recent.map((s) => {
            const status = serviceStatus(s)
            return (
              <li
                key={s.id}
                className="flex items-center gap-3 py-2.5 text-sm"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-white">
                    {s.typeName ?? "Serviço"}
                    {s.customerName ? (
                      <span className="text-white/40">
                        {" "}
                        · {s.customerName}
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-white/40">
                    {showProfessional && s.employeeName
                      ? `${s.employeeName} · `
                      : ""}
                    {fmtDate(s.performedAt)}
                  </p>
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium",
                    STATUS_VARIANT[status],
                  )}
                >
                  {SERVICE_STATUS_LABELS[status]}
                </span>
                <span className="w-24 shrink-0 text-right font-medium text-white">
                  {formatBRL(s.amountCents)}
                </span>
              </li>
            )
          })}
        </Rows>
      )}
    </SectionCard>
  )
}

/* ── Transações recentes (owner) ─────────────────────────────────── */

function RecentTransactionsSection({
  orgId,
  basePath,
}: {
  orgId: string
  basePath: string
}) {
  const { transactions, loading } = useTransactions(orgId)
  const { categories } = useTransactionCategories(orgId)
  const categoryName = React.useMemo(() => {
    const map = new Map(categories.map((c) => [c.id, c.name]))
    return (id: string | null) => (id ? (map.get(id) ?? null) : null)
  }, [categories])

  const recent = React.useMemo(
    () =>
      [...transactions]
        .sort(
          (a, b) =>
            +new Date(b.entity.transactedAt) - +new Date(a.entity.transactedAt),
        )
        .slice(0, 10),
    [transactions],
  )

  return (
    <SectionCard
      title="Transações recentes"
      icon={Wallet}
      href={`${basePath}/cashier`}
      className="lg:col-span-2"
    >
      {loading ? (
        <Loading />
      ) : recent.length === 0 ? (
        <Empty>Nenhuma transação registrada ainda.</Empty>
      ) : (
        <Rows>
          {recent.map(({ entity: t }) => {
            const isIncome = t.type === "income"
            const cat = categoryName(t.categoryId)
            return (
              <li
                key={t.id}
                className="flex items-center gap-3 py-2.5 text-sm"
              >
                <span
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                    isIncome
                      ? "bg-emerald-500/15 text-emerald-400"
                      : "bg-red-500/15 text-red-400",
                  )}
                >
                  {isIncome ? (
                    <ArrowUpRight className="h-4 w-4" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-white">{t.description}</p>
                  <p className="mt-0.5 truncate text-xs text-white/40">
                    {TRANSACTION_TYPE_LABELS[t.type]}
                    {cat ? ` · ${cat}` : ""} · {fmtDate(t.transactedAt)}
                  </p>
                </div>
                <span
                  className={cn(
                    "shrink-0 font-medium",
                    isIncome ? "text-emerald-400" : "text-red-400",
                  )}
                >
                  {isIncome ? "+" : "-"}
                  {formatBRL(t.netCents)}
                </span>
              </li>
            )
          })}
        </Rows>
      )}
    </SectionCard>
  )
}

/* ── Estoque baixo ───────────────────────────────────────────────── */

function LowStockSection({
  orgId,
  basePath,
}: {
  orgId: string
  basePath: string
}) {
  const { materials, loading } = useMaterials(orgId, { lowStockOnly: true })
  const items = React.useMemo(() => materials.slice(0, 20), [materials])

  return (
    <SectionCard title="Estoque baixo" icon={Archive} href={`${basePath}/stock`}>
      {loading ? (
        <Loading />
      ) : items.length === 0 ? (
        <Empty>Nenhum material com estoque baixo. 🎉</Empty>
      ) : (
        <Rows>
          {items.map((m) => (
            <li key={m.id} className="flex items-center gap-3 py-2.5 text-sm">
              <div className="min-w-0 flex-1">
                <p className="truncate text-white">{m.name}</p>
                <p className="mt-0.5 text-xs text-white/40">
                  {m.stockQuantity} em estoque · mín. {m.minimumQuantity}
                </p>
              </div>
              <Badge
                variant="destructive"
                className="shrink-0 bg-red-500/15 text-red-400"
              >
                Baixo
              </Badge>
            </li>
          ))}
        </Rows>
      )}
    </SectionCard>
  )
}

/* ── Próximos eventos de agenda ──────────────────────────────────── */

function UpcomingEventsSection({
  orgId,
  basePath,
}: {
  orgId: string
  basePath: string
}) {
  // Janela estável (calculada uma vez) para não recriar a query a cada render.
  const range = React.useMemo(() => {
    const now = new Date()
    return { start: now, end: new Date(now.getTime() + 90 * DAY_MS) }
  }, [])
  const { events, loading } = useCalendarEvents({
    orgId,
    start: range.start,
    end: range.end,
  })

  const upcoming = React.useMemo(() => {
    const now = Date.now()
    return [...events]
      .filter((e) => e.status !== "canceled" && +new Date(e.endsAt) >= now)
      .sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt))
      .slice(0, 10)
  }, [events])

  return (
    <SectionCard
      title="Próximos eventos"
      icon={CalendarDays}
      href={`${basePath}/schedule`}
    >
      {loading ? (
        <Loading />
      ) : upcoming.length === 0 ? (
        <Empty>Nenhum evento próximo na agenda.</Empty>
      ) : (
        <Rows>
          {upcoming.map((e) => (
            <li key={e.id} className="flex items-center gap-3 py-2.5 text-sm">
              <div className="min-w-0 flex-1">
                <p className="truncate text-white">{e.title}</p>
                <p className="mt-0.5 truncate text-xs text-white/40">
                  {e.type === "appointment" ? "Agendamento" : "Bloqueio"} ·{" "}
                  {fmtDate(e.startsAt)}
                  {!e.allDay && ` · ${fmtTime(e.startsAt)}–${fmtTime(e.endsAt)}`}
                </p>
              </div>
              {e.allDay && (
                <Badge variant="secondary" className="shrink-0">
                  Dia inteiro
                </Badge>
              )}
            </li>
          ))}
        </Rows>
      )}
    </SectionCard>
  )
}

/* ── Clientes recentes (owner) ───────────────────────────────────── */

function RecentCustomersSection({
  orgId,
  basePath,
}: {
  orgId: string
  basePath: string
}) {
  const { customers, loading } = useCustomers(orgId)
  const recent = React.useMemo(
    () =>
      [...customers]
        .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
        .slice(0, 10),
    [customers],
  )

  return (
    <SectionCard
      title="Clientes recentes"
      icon={Users}
      href={`${basePath}/clients`}
    >
      {loading ? (
        <Loading />
      ) : recent.length === 0 ? (
        <Empty>Nenhum cliente cadastrado ainda.</Empty>
      ) : (
        <Rows>
          {recent.map((c) => (
            <li key={c.id} className="flex items-center gap-3 py-2.5 text-sm">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-500/15 text-xs font-medium text-orange-400">
                {c.name.charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-white">{c.name}</p>
                <p className="mt-0.5 truncate text-xs text-white/40">
                  {c.phone ?? c.email ?? "—"}
                </p>
              </div>
              <span className="shrink-0 text-xs text-white/40">
                {fmtDate(c.createdAt)}
              </span>
            </li>
          ))}
        </Rows>
      )}
    </SectionCard>
  )
}

/* ── Página ──────────────────────────────────────────────────────── */

export function OverviewPage() {
  const { org, orgId } = useCurrentOrg()
  const isOwner = org.role === "owner"
  const basePath = `/dashboard/org/${org.slug}`

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Overview</h1>
        <p className="mt-0.5 text-sm text-white/40">
          {isOwner
            ? "Resumo geral do estúdio."
            : "Resumo dos seus atendimentos e agenda."}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <RecentServicesSection
          orgId={orgId}
          basePath={basePath}
          showProfessional={isOwner}
        />
        <UpcomingEventsSection orgId={orgId} basePath={basePath} />
        <LowStockSection orgId={orgId} basePath={basePath} />
        {isOwner && (
          <RecentTransactionsSection orgId={orgId} basePath={basePath} />
        )}
        {isOwner && (
          <RecentCustomersSection orgId={orgId} basePath={basePath} />
        )}
      </div>
    </div>
  )
}
