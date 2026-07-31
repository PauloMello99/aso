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
  Landmark,
  type LucideIcon,
} from "lucide-react"
import { cn } from "@/shared/lib/utils"
import { Badge } from "@/shared/components/ui/badge"
import { SectionCard } from "@/shared/components/section-card"
import { useCurrentOrg } from "@/features/dashboard"
import { useBalance } from "@/features/cashier/hooks/use-balance"
import { BalanceCards } from "@/features/cashier/components/balance-cards"
import { useOverview } from "../hooks/use-overview"
import { useOverviewAnalytics } from "../hooks/use-overview-analytics"
import { overviewVisibility } from "../lib/overview-visibility"
import {
  PerformanceSection,
  EmployeePerformance,
  periodRange,
  type PeriodKey,
} from "./performance-section"
import { formatBRL } from "@/features/cashier/lib/money"
import {
  serviceStatus,
  SERVICE_STATUS_LABELS,
  type Service,
  type ServiceStatus,
} from "@/features/services/types"
import {
  TRANSACTION_TYPE_LABELS,
  type TransactionView,
  type TransactionCategory,
} from "@/features/cashier/types"
import type { CalendarEvent } from "@/features/agenda/types"
import type { Material } from "@/features/stock/types"
import type { Customer } from "@/features/clients/types"

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

const STATUS_BADGE_VARIANT: Record<
  ServiceStatus,
  "success" | "warning" | "ghost"
> = {
  paid: "success",
  pending: "warning",
  canceled: "ghost",
}

function EmptyState({
  icon: Icon,
  title,
  action,
}: {
  icon: LucideIcon
  title: string
  action?: { label: string; href: string }
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 py-8 text-center">
      <Icon className="h-6 w-6 text-foreground/20" />
      <p className="text-sm text-foreground/40">{title}</p>
      {action && (
        <Link
          href={action.href}
          className="text-sm font-medium text-primary transition-colors hover:text-primary/80"
        >
          {action.label}
        </Link>
      )}
    </div>
  )
}

function Loading() {
  return (
    <div className="flex items-center justify-center py-8 text-foreground/30">
      <Loader2 className="h-4 w-4 animate-spin" />
    </div>
  )
}

function Rows({ children }: { children: React.ReactNode }) {
  return <ul className="divide-y divide-foreground/[0.05]">{children}</ul>
}

function RecentServicesSection({
  services,
  loading,
  basePath,
  showProfessional,
}: {
  services: Service[]
  loading: boolean
  basePath: string
  showProfessional: boolean
}) {
  return (
    <SectionCard
      title="Serviços recentes"
      icon={Package}
      href={`${basePath}/services`}
    >
      {loading ? (
        <Loading />
      ) : services.length === 0 ? (
        <EmptyState
          icon={Package}
          title="Nenhum serviço ainda"
          action={{ label: "Registrar atendimento", href: `${basePath}/services` }}
        />
      ) : (
        <Rows>
          {services.map((s) => {
            const status = serviceStatus(s)
            return (
              <li
                key={s.id}
                className="flex items-center gap-3 py-2.5 text-sm"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-foreground">
                    {s.typeName ?? "Serviço"}
                    {s.customerName ? (
                      <span className="text-foreground/40"> · {s.customerName}</span>
                    ) : null}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-foreground/40">
                    {showProfessional && s.employeeName
                      ? `${s.employeeName} · `
                      : ""}
                    {fmtDate(s.performedAt)}
                  </p>
                </div>
                <Badge
                  variant={STATUS_BADGE_VARIANT[status]}
                  className={cn(
                    "shrink-0 px-2 py-0.5 text-[10px]",
                    status === "canceled" && "text-text-muted line-through",
                  )}
                >
                  {SERVICE_STATUS_LABELS[status]}
                </Badge>
                <span className="w-24 shrink-0 text-right font-medium text-foreground">
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

function RecentTransactionsSection({
  transactions,
  categories,
  loading,
  basePath,
}: {
  transactions: TransactionView[]
  categories: TransactionCategory[]
  loading: boolean
  basePath: string
}) {
  const categoryName = React.useMemo(() => {
    const map = new Map(categories.map((c) => [c.id, c.name]))
    return (id: string | null) => (id ? (map.get(id) ?? null) : null)
  }, [categories])

  return (
    <SectionCard
      title="Transações recentes"
      icon={Wallet}
      href={`${basePath}/cashier`}
    >
      {loading ? (
        <Loading />
      ) : transactions.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="Nenhuma transação ainda"
          action={{ label: "Abrir o caixa", href: `${basePath}/cashier` }}
        />
      ) : (
        <Rows>
          {transactions.map(({ entity: t }) => {
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
                      ? "bg-success/15 text-success"
                      : "bg-destructive/15 text-destructive",
                  )}
                >
                  {isIncome ? (
                    <ArrowUpRight className="h-4 w-4" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-foreground">{t.description}</p>
                  <p className="mt-0.5 truncate text-xs text-foreground/40">
                    {TRANSACTION_TYPE_LABELS[t.type]}
                    {cat ? ` · ${cat}` : ""} · {fmtDate(t.transactedAt)}
                  </p>
                </div>
                <span
                  className={cn(
                    "shrink-0 font-medium",
                    isIncome ? "text-success" : "text-destructive",
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

function restockQty(m: Material): number {
  const deficit = parseFloat(m.minimumQuantity) - parseFloat(m.stockQuantity)
  return deficit > 0 ? deficit : 0
}

function restockCents(m: Material): number | null {
  if (m.costPerUnit == null) return null
  const cost = parseFloat(m.costPerUnit)
  if (Number.isNaN(cost)) return null
  return Math.round(restockQty(m) * cost * 100)
}

function restockEstimate(materials: Material[]): {
  totalCents: number
  missingCost: number
} {
  let totalCents = 0
  let missingCost = 0
  for (const m of materials) {
    const cents = restockCents(m)
    if (cents === null) missingCost += 1
    else totalCents += cents
  }
  return { totalCents, missingCost }
}

function LowStockSection({
  materials,
  loading,
  basePath,
}: {
  materials: Material[]
  loading: boolean
  basePath: string
}) {
  const { totalCents, missingCost } = restockEstimate(materials)

  return (
    <SectionCard title="Estoque baixo" icon={Archive} href={`${basePath}/stock`}>
      {loading ? (
        <Loading />
      ) : materials.length === 0 ? (
        <EmptyState icon={Archive} title="Estoque saudável" />
      ) : (
        <>
          <Rows>
            {materials.map((m) => {
              const cents = restockCents(m)
              return (
                <li
                  key={m.id}
                  className="flex items-center gap-3 py-2.5 text-sm"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-foreground">{m.name}</p>
                    <p className="mt-0.5 text-xs text-foreground/40">
                      {m.stockQuantity} em estoque · mín. {m.minimumQuantity}
                      {cents !== null && cents > 0
                        ? ` · repor ${formatBRL(cents)}`
                        : ""}
                    </p>
                  </div>
                  <Badge
                    variant="destructive"
                    className="shrink-0 bg-destructive/15 text-destructive"
                  >
                    Baixo
                  </Badge>
                </li>
              )
            })}
          </Rows>
          <div className="mt-3 flex items-center justify-between border-t border-foreground/[0.06] pt-3 text-sm">
            <span className="text-foreground/50">Repor tudo (estimado)</span>
            <span className="font-semibold text-foreground">
              {formatBRL(totalCents)}
            </span>
          </div>
          {missingCost > 0 && (
            <p className="mt-1 text-xs text-foreground/30">
              {missingCost}{" "}
              {missingCost === 1
                ? "item sem custo cadastrado não entra no total."
                : "itens sem custo cadastrado não entram no total."}
            </p>
          )}
        </>
      )}
    </SectionCard>
  )
}

function UpcomingEventsSection({
  events,
  loading,
  basePath,
}: {
  events: CalendarEvent[]
  loading: boolean
  basePath: string
}) {
  return (
    <SectionCard
      title="Próximos eventos"
      icon={CalendarDays}
      href={`${basePath}/schedule`}
    >
      {loading ? (
        <Loading />
      ) : events.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="Agenda livre"
          action={{ label: "Agendar atendimento", href: `${basePath}/schedule` }}
        />
      ) : (
        <Rows>
          {events.map((e) => (
            <li key={e.id} className="flex items-center gap-3 py-2.5 text-sm">
              <div className="min-w-0 flex-1">
                <p className="truncate text-foreground">{e.title}</p>
                <p className="mt-0.5 truncate text-xs text-foreground/40">
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

function RecentCustomersSection({
  customers,
  loading,
  basePath,
}: {
  customers: Customer[]
  loading: boolean
  basePath: string
}) {
  return (
    <SectionCard title="Clientes recentes" icon={Users} href={`${basePath}/clients`}>
      {loading ? (
        <Loading />
      ) : customers.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Nenhum cliente ainda"
          action={{ label: "Cadastrar cliente", href: `${basePath}/clients` }}
        />
      ) : (
        <Rows>
          {customers.map((c) => (
            <li key={c.id} className="flex items-center gap-3 py-2.5 text-sm">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-medium text-primary">
                {c.name.charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-foreground">{c.name}</p>
                <p className="mt-0.5 truncate text-xs text-foreground/40">
                  {c.phone ?? c.email ?? "—"}
                </p>
              </div>
              <span className="shrink-0 text-xs text-foreground/40">
                {fmtDate(c.createdAt)}
              </span>
            </li>
          ))}
        </Rows>
      )}
    </SectionCard>
  )
}

function BalanceRow({ label, cents }: { label: string; cents: number }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-foreground/50">{label}</span>
      <span className="tabular-nums text-foreground">{formatBRL(cents)}</span>
    </div>
  )
}

function CashBalanceSection({
  orgId,
  basePath,
}: {
  orgId: string
  basePath: string
}) {
  const { balance, loading } = useBalance(orgId)
  return (
    <SectionCard title="Saldo do caixa" icon={Landmark} href={`${basePath}/cashier`}>
      {loading ? (
        <Loading />
      ) : (
        <div className="flex h-full flex-col justify-center gap-3">
          <BalanceRow label="Dinheiro" cents={balance.cashCents} />
          <BalanceRow label="Digital" cents={balance.digitalCents} />
          <div className="mt-1 flex items-center justify-between border-t border-foreground/[0.06] pt-3">
            <span className="text-sm text-foreground/50">Total</span>
            <span className="text-base font-semibold tabular-nums text-foreground">
              {formatBRL(balance.totalCents)}
            </span>
          </div>
        </div>
      )}
    </SectionCard>
  )
}

function BandLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[11px] font-semibold uppercase tracking-widest text-foreground/30">
        {children}
      </span>
      <span className="h-px flex-1 bg-foreground/[0.06]" />
    </div>
  )
}

export function OverviewPage() {
  const { org, orgId } = useCurrentOrg()
  const isOwner = org.role === "owner"
  const vis = overviewVisibility(org.role, org.permissions)
  const basePath = `/dashboard/org/${org.slug}`

  const [periodKey, setPeriodKey] = React.useState<PeriodKey>("month")
  const range = React.useMemo(() => periodRange(periodKey), [periodKey])

  const { data, loading } = useOverview(orgId)
  const { data: analytics, loading: analyticsLoading } = useOverviewAnalytics(
    orgId,
    range,
    { enabled: vis.services },
  )
  const { balance, loading: balanceLoading } = useBalance(orgId, {
    enabled: vis.cashier,
  })

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Overview</h1>
        <p className="mt-0.5 text-sm text-foreground/40">
          {isOwner
            ? "Resumo geral do estúdio."
            : "Resumo dos seus atendimentos e agenda."}
        </p>
      </div>

      {vis.cashier && (
        <BalanceCards balance={balance} loading={balanceLoading} />
      )}

      {vis.hasAnyCard ? (
        <section className="space-y-3">
          <BandLabel>Operações</BandLabel>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {vis.services && (
              <RecentServicesSection
                services={(data?.recentServices ?? []).slice(0, 5)}
                loading={loading}
                basePath={basePath}
                showProfessional={isOwner}
              />
            )}
            {vis.schedule && (
              <UpcomingEventsSection
                events={(data?.upcomingEvents ?? []).slice(0, 5)}
                loading={loading}
                basePath={basePath}
              />
            )}
            {vis.stock && (
              <LowStockSection
                materials={data?.lowStock ?? []}
                loading={loading}
                basePath={basePath}
              />
            )}
            {vis.cashier && (
              <RecentTransactionsSection
                transactions={(data?.recentTransactions ?? []).slice(0, 5)}
                categories={data?.transactionCategories ?? []}
                loading={loading}
                basePath={basePath}
              />
            )}
            {vis.clients && (
              <RecentCustomersSection
                customers={(data?.recentCustomers ?? []).slice(0, 5)}
                loading={loading}
                basePath={basePath}
              />
            )}
            {vis.cashier && (
              <CashBalanceSection orgId={orgId} basePath={basePath} />
            )}
          </div>
        </section>
      ) : (
        <SectionCard title="Sem acesso" icon={Package} className="min-h-[10rem]">
          <EmptyState
            icon={Package}
            title="Nenhum módulo liberado para você. Fale com o administrador do estúdio."
          />
        </SectionCard>
      )}

      {isOwner ? (
        <PerformanceSection
          data={analytics}
          loading={analyticsLoading}
          periodKey={periodKey}
          onPeriodChange={setPeriodKey}
        />
      ) : (
        vis.services && (
          <EmployeePerformance
            data={analytics}
            loading={analyticsLoading}
            periodKey={periodKey}
            onPeriodChange={setPeriodKey}
          />
        )
      )}
    </div>
  )
}
