"use client"

import * as React from "react"
import {
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Package,
  Receipt,
  UserPlus,
  Boxes,
  PiggyBank,
  Percent,
  ArrowUp,
  ArrowDown,
} from "lucide-react"
import { cn } from "@/shared/lib/utils"
import { formatBRL } from "@/features/cashier/lib/money"
import type {
  KpiWithDelta,
  OverviewAnalytics,
} from "../hooks/use-overview-analytics"
import {
  BalanceAreaChart,
  ChartCard,
  HorizontalRevenueChart,
  IncomeExpenseChart,
  PaymentMethodsChart,
} from "./charts"

export type PeriodKey = "month" | "30d" | "90d"

const PERIOD_LABELS: Record<PeriodKey, string> = {
  month: "Mês atual",
  "30d": "30 dias",
  "90d": "90 dias",
}

export function periodRange(key: PeriodKey): { from: string; to: string } {
  const now = new Date()
  const to = now.toISOString()
  if (key === "month") {
    return {
      from: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
      to,
    }
  }
  const days = key === "90d" ? 90 : 30
  return { from: new Date(now.getTime() - days * 86400000).toISOString(), to }
}

function PeriodSelector({
  value,
  onChange,
}: {
  value: PeriodKey
  onChange: (k: PeriodKey) => void
}) {
  return (
    <div className="flex gap-1 rounded-lg border border-foreground/[0.06] p-0.5">
      {(Object.keys(PERIOD_LABELS) as PeriodKey[]).map((k) => (
        <button
          key={k}
          type="button"
          onClick={() => onChange(k)}
          className={cn(
            "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
            value === k
              ? "bg-foreground/[0.08] text-foreground"
              : "text-foreground/50 hover:text-foreground",
          )}
        >
          {PERIOD_LABELS[k]}
        </button>
      ))}
    </div>
  )
}

function Delta({
  kpi,
  goodWhenUp = true,
}: {
  kpi?: KpiWithDelta
  goodWhenUp?: boolean
}) {
  if (!kpi || kpi.deltaPercent === null) {
    return <span className="text-[11px] text-foreground/30">novo</span>
  }
  if (kpi.deltaPercent === 0) {
    return <span className="text-[11px] text-foreground/30">—</span>
  }
  const up = kpi.deltaPercent > 0
  const good = up === goodWhenUp
  const Icon = up ? ArrowUp : ArrowDown
  return (
    <span
      className={cn(
        "flex items-center gap-0.5 text-[11px] font-medium tabular-nums",
        good ? "text-emerald-400" : "text-red-400",
      )}
    >
      <Icon className="h-3 w-3" />
      {Math.abs(kpi.deltaPercent).toLocaleString("pt-BR", {
        maximumFractionDigits: 1,
      })}
      %
    </span>
  )
}

function Kpi({
  label,
  value,
  icon: Icon,
  tone,
  kpi,
  goodWhenUp,
}: {
  label: string
  value: string
  icon: typeof TrendingUp
  tone?: "positive" | "negative" | "neutral"
  kpi?: KpiWithDelta
  goodWhenUp?: boolean
}) {
  return (
    <div className="rounded-xl border border-foreground/[0.06] bg-foreground/[0.02] p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-foreground/50">
          <Icon className="h-3.5 w-3.5 text-orange-400" />
          {label}
        </div>
        <Delta kpi={kpi} goodWhenUp={goodWhenUp} />
      </div>
      <p
        className={cn(
          "mt-1.5 text-xl font-semibold tabular-nums",
          tone === "positive" && "text-emerald-400",
          tone === "negative" && "text-red-400",
          (!tone || tone === "neutral") && "text-foreground",
        )}
      >
        {value}
      </p>
    </div>
  )
}

function BandHeader({
  periodKey,
  onPeriodChange,
}: {
  periodKey: PeriodKey
  onPeriodChange: (k: PeriodKey) => void
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-widest text-foreground/30">
          Desempenho
        </span>
      </div>
      <PeriodSelector value={periodKey} onChange={onPeriodChange} />
    </div>
  )
}

export function PerformanceSection({
  data,
  loading,
  periodKey,
  onPeriodChange,
}: {
  data?: OverviewAnalytics
  loading: boolean
  periodKey: PeriodKey
  onPeriodChange: (k: PeriodKey) => void
}) {
  const m = data?.margin
  const resultado = data?.resultadoCents?.current ?? 0
  const profit = m?.profitCents ?? 0

  return (
    <section className="grid gap-4">
      <BandHeader periodKey={periodKey} onPeriodChange={onPeriodChange} />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Kpi
          label="Resultado"
          value={formatBRL(resultado)}
          icon={TrendingUp}
          tone={resultado >= 0 ? "positive" : "negative"}
          kpi={data?.resultadoCents}
        />
        <Kpi
          label="Receita"
          value={formatBRL(data?.receitaCents?.current ?? 0)}
          icon={ArrowUpRight}
          tone="positive"
          kpi={data?.receitaCents}
        />
        <Kpi
          label="Despesa"
          value={formatBRL(data?.despesaCents?.current ?? 0)}
          icon={ArrowDownRight}
          tone="negative"
          kpi={data?.despesaCents}
          goodWhenUp={false}
        />
        <Kpi
          label="Serviços"
          value={String(data?.servicesCount?.current ?? 0)}
          icon={Package}
          kpi={data?.servicesCount}
        />
        <Kpi
          label="Ticket médio"
          value={formatBRL(data?.avgTicketCents?.current ?? 0)}
          icon={Receipt}
          kpi={data?.avgTicketCents}
        />
        <Kpi
          label="Novos clientes"
          value={String(data?.newCustomersCount?.current ?? 0)}
          icon={UserPlus}
          kpi={data?.newCustomersCount}
        />
      </div>

      <div className="rounded-xl border border-foreground/[0.06] bg-foreground/[0.02] p-5">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
          <PiggyBank className="h-4 w-4 text-orange-400" />
          Custo &amp; lucro dos serviços
        </h3>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <MiniStat
            label="Receita de serviços"
            value={formatBRL(m?.serviceRevenueCents ?? 0)}
            icon={Receipt}
            tone="positive"
          />
          <MiniStat
            label="Custo de material"
            value={formatBRL(m?.materialCostCents ?? 0)}
            icon={Boxes}
            tone="negative"
          />
          <MiniStat
            label="Lucro"
            value={formatBRL(profit)}
            icon={TrendingUp}
            tone={profit >= 0 ? "positive" : "negative"}
          />
          <MiniStat
            label="Margem"
            value={`${(m?.marginPercent ?? 0).toLocaleString("pt-BR", {
              maximumFractionDigits: 1,
            })}%`}
            icon={Percent}
            tone={(m?.marginPercent ?? 0) >= 0 ? "positive" : "negative"}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard
          title="Saldo no período"
          loading={loading}
          isEmpty={!data?.series || data.series.length === 0}
        >
          <BalanceAreaChart series={data?.series ?? []} />
        </ChartCard>
        <ChartCard
          title="Entradas × Saídas"
          loading={loading}
          isEmpty={
            !data?.incomeExpenseSeries || data.incomeExpenseSeries.length === 0
          }
        >
          <IncomeExpenseChart data={data?.incomeExpenseSeries ?? []} />
        </ChartCard>
        <ChartCard
          title="Serviços por tipo"
          loading={loading}
          isEmpty={!data?.servicesByType || data.servicesByType.length === 0}
        >
          <HorizontalRevenueChart data={data?.servicesByType ?? []} />
        </ChartCard>
        <ChartCard
          title="Receita por profissional"
          loading={loading}
          isEmpty={
            !data?.revenueByProfessional ||
            data.revenueByProfessional.length === 0
          }
        >
          <HorizontalRevenueChart data={data?.revenueByProfessional ?? []} />
        </ChartCard>
        <ChartCard
          title="Métodos de pagamento"
          loading={loading}
          isEmpty={!data?.paymentMethods || data.paymentMethods.length === 0}
          className="lg:col-span-2"
        >
          <PaymentMethodsChart data={data?.paymentMethods ?? []} />
        </ChartCard>
      </div>
    </section>
  )
}

function MiniStat({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string
  value: string
  icon: typeof TrendingUp
  tone?: "positive" | "negative"
}) {
  return (
    <div className="rounded-lg bg-foreground/[0.02] p-3">
      <div className="flex items-center gap-1.5 text-xs text-foreground/50">
        <Icon className="h-3.5 w-3.5 text-orange-400" />
        {label}
      </div>
      <p
        className={cn(
          "mt-1 text-lg font-semibold tabular-nums",
          tone === "positive" && "text-emerald-400",
          tone === "negative" && "text-red-400",
          !tone && "text-foreground",
        )}
      >
        {value}
      </p>
    </div>
  )
}

export function EmployeePerformance({
  data,
  periodKey,
  onPeriodChange,
}: {
  data?: OverviewAnalytics
  loading: boolean
  periodKey: PeriodKey
  onPeriodChange: (k: PeriodKey) => void
}) {
  return (
    <section className="grid gap-4">
      <BandHeader periodKey={periodKey} onPeriodChange={onPeriodChange} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Kpi
          label="Meus serviços"
          value={String(data?.servicesCount?.current ?? 0)}
          icon={Package}
          kpi={data?.servicesCount}
        />
        <Kpi
          label="Minha receita"
          value={formatBRL(data?.serviceRevenueCents?.current ?? 0)}
          icon={ArrowUpRight}
          tone="positive"
          kpi={data?.serviceRevenueCents}
        />
        <Kpi
          label="Ticket médio"
          value={formatBRL(data?.avgTicketCents?.current ?? 0)}
          icon={Receipt}
          kpi={data?.avgTicketCents}
        />
      </div>
    </section>
  )
}
