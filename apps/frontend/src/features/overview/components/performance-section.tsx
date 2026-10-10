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
  HandCoins,
} from "lucide-react"
import { cn } from "@/shared/lib/utils"
import { useMoneyFormatter } from "@/shared/hooks/use-money-formatter"
import type {
  KpiWithDelta,
  OverviewAnalytics,
} from "../hooks/use-overview-analytics"
import type {
  ViewId,
  ViewOption,
  ViewPreferences,
} from "../lib/view-preferences"
import {
  BalanceAreaChart,
  ChartCard,
  MaterialsBarChart,
  MaterialsList,
  PaymentMethodsView,
  RevenueBarChart,
  ViewToggle,
} from "./charts"

type PreferenceChange = <K extends ViewId>(id: K, value: ViewOption<K>) => void

const ORIENTATION_OPTIONS = [
  { value: "bars-h", label: "Horizontal" },
  { value: "bars-v", label: "Vertical" },
] as const

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
        good ? "text-success" : "text-destructive",
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
    <div className="min-w-0 rounded-xl border border-foreground/[0.06] bg-foreground/[0.02] p-3 sm:p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-1.5 text-xs leading-tight text-foreground/50">
          <Icon className="h-3.5 w-3.5 shrink-0 text-primary" />
          <span className="min-w-0 text-balance">{label}</span>
        </div>
        <Delta kpi={kpi} goodWhenUp={goodWhenUp} />
      </div>
      <p
        className={cn(
          "mt-1.5 whitespace-nowrap text-base font-semibold tabular-nums sm:text-lg",
          tone === "positive" && "text-success",
          tone === "negative" && "text-destructive",
          (!tone || tone === "neutral") && "text-foreground",
        )}
      >
        {value}
      </p>
    </div>
  )
}

function BandHeader() {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[11px] font-semibold uppercase tracking-widest text-foreground/30">
        Desempenho
      </span>
      <span className="h-px flex-1 bg-foreground/[0.06]" />
    </div>
  )
}

export function PerformanceSection({
  data,
  loading,
  prefs,
  onPreferenceChange,
}: {
  data?: OverviewAnalytics
  loading: boolean
  prefs: ViewPreferences
  onPreferenceChange: PreferenceChange
}) {
  const money = useMoneyFormatter()
  const m = data?.margin
  const resultado = data?.resultadoCents?.current ?? 0
  const profit = m?.profitCents ?? 0
  const materials = data?.materialsConsumption ?? []

  return (
    <section className="grid gap-4">
      <BandHeader />

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(11rem,100%),1fr))] gap-3">
        <Kpi
          label="Resultado"
          value={money(resultado)}
          icon={TrendingUp}
          tone={resultado >= 0 ? "positive" : "negative"}
          kpi={data?.resultadoCents}
        />
        <Kpi
          label="Receita"
          value={money(data?.receitaCents?.current ?? 0)}
          icon={ArrowUpRight}
          tone="positive"
          kpi={data?.receitaCents}
        />
        <Kpi
          label="Despesa"
          value={money(data?.despesaCents?.current ?? 0)}
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
          value={money(data?.avgTicketCents?.current ?? 0)}
          icon={Receipt}
          kpi={data?.avgTicketCents}
        />
        <Kpi
          label="Novos clientes"
          value={String(data?.newCustomersCount?.current ?? 0)}
          icon={UserPlus}
          kpi={data?.newCustomersCount}
        />
        <Kpi
          label="Comissão a repassar"
          value={money(data?.commissionCents?.current ?? 0)}
          icon={HandCoins}
          kpi={data?.commissionCents}
        />
      </div>

      <div className="rounded-xl border border-foreground/[0.06] bg-foreground/[0.02] p-4 sm:p-5">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground">
          <PiggyBank className="h-4 w-4 text-primary" />
          Custo &amp; lucro dos serviços
        </h3>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(11rem,100%),1fr))] gap-3">
          <MiniStat
            label="Receita de serviços"
            value={money(m?.serviceRevenueCents ?? 0)}
            icon={Receipt}
            tone="positive"
          />
          <MiniStat
            label="Custo de material"
            value={money(m?.materialCostCents ?? 0)}
            icon={Boxes}
            tone="negative"
          />
          <MiniStat
            label="Lucro"
            value={money(profit)}
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
          actions={
            <ViewToggle
              label="Exibição do saldo"
              value={prefs.balance}
              onChange={(v) => onPreferenceChange("balance", v)}
              options={[
                { value: "area", label: "Área" },
                { value: "line", label: "Linha" },
              ]}
            />
          }
        >
          <BalanceAreaChart
            series={data?.series ?? []}
            variant={prefs.balance}
          />
        </ChartCard>
        <ChartCard
          title="Materiais mais gastos"
          loading={loading}
          isEmpty={materials.length === 0}
          emptyLabel="Nenhum material consumido no período."
          actions={
            <ViewToggle
              label="Exibição dos materiais"
              value={prefs.materials}
              onChange={(v) => onPreferenceChange("materials", v)}
              options={[
                { value: "bars-h", label: "Barras" },
                { value: "list", label: "Lista" },
              ]}
            />
          }
        >
          {prefs.materials === "list" ? (
            <MaterialsList data={materials} />
          ) : (
            <MaterialsBarChart data={materials} />
          )}
        </ChartCard>
        <ChartCard
          title="Serviços por tipo"
          loading={loading}
          isEmpty={!data?.servicesByType || data.servicesByType.length === 0}
          actions={
            <ViewToggle
              label="Orientação de serviços por tipo"
              value={prefs.servicesByType}
              onChange={(v) => onPreferenceChange("servicesByType", v)}
              options={ORIENTATION_OPTIONS}
            />
          }
        >
          <RevenueBarChart
            data={data?.servicesByType ?? []}
            orientation={
              prefs.servicesByType === "bars-v" ? "vertical" : "horizontal"
            }
          />
        </ChartCard>
        <ChartCard
          title="Receita por profissional"
          loading={loading}
          isEmpty={
            !data?.revenueByProfessional ||
            data.revenueByProfessional.length === 0
          }
          actions={
            <ViewToggle
              label="Orientação de receita por profissional"
              value={prefs.revenueByProfessional}
              onChange={(v) => onPreferenceChange("revenueByProfessional", v)}
              options={ORIENTATION_OPTIONS}
            />
          }
        >
          <RevenueBarChart
            data={data?.revenueByProfessional ?? []}
            orientation={
              prefs.revenueByProfessional === "bars-v"
                ? "vertical"
                : "horizontal"
            }
          />
        </ChartCard>
        <ChartCard
          title="Métodos de pagamento"
          loading={loading}
          isEmpty={!data?.paymentMethods || data.paymentMethods.length === 0}
          className="lg:col-span-2"
          contentClassName={prefs.paymentMethods === "both" ? "h-auto" : undefined}
          actions={
            <ViewToggle
              label="Exibição dos métodos de pagamento"
              value={prefs.paymentMethods}
              onChange={(v) => onPreferenceChange("paymentMethods", v)}
              options={[
                { value: "both", label: "Ambos" },
                { value: "donut", label: "Rosca" },
                { value: "list", label: "Lista" },
              ]}
            />
          }
        >
          <PaymentMethodsView
            data={data?.paymentMethods ?? []}
            view={prefs.paymentMethods}
          />
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
    <div className="min-w-0 rounded-lg bg-foreground/[0.02] p-3">
      <div className="flex min-w-0 items-start gap-1.5 text-xs leading-tight text-foreground/50">
        <Icon className="h-3.5 w-3.5 shrink-0 text-primary" />
        <span className="min-w-0 text-balance">{label}</span>
      </div>
      <p
        className={cn(
          "mt-1 whitespace-nowrap text-base font-semibold tabular-nums sm:text-lg",
          tone === "positive" && "text-success",
          tone === "negative" && "text-destructive",
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
}: {
  data?: OverviewAnalytics
  loading: boolean
}) {
  const money = useMoneyFormatter()
  return (
    <section className="grid gap-4">
      <BandHeader />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          label="Meus serviços"
          value={String(data?.servicesCount?.current ?? 0)}
          icon={Package}
          kpi={data?.servicesCount}
        />
        <Kpi
          label="Minha receita"
          value={money(data?.serviceRevenueCents?.current ?? 0)}
          icon={ArrowUpRight}
          tone="positive"
          kpi={data?.serviceRevenueCents}
        />
        <Kpi
          label="Minha comissão"
          value={money(data?.commissionCents?.current ?? 0)}
          icon={HandCoins}
          tone="positive"
          kpi={data?.commissionCents}
        />
        <Kpi
          label="Ticket médio"
          value={money(data?.avgTicketCents?.current ?? 0)}
          icon={Receipt}
          kpi={data?.avgTicketCents}
        />
      </div>
    </section>
  )
}
