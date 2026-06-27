"use client"

import * as React from "react"
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import {
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Package,
  Receipt,
  UserPlus,
  Loader2,
  Boxes,
  PiggyBank,
  Percent,
} from "lucide-react"
import { cn } from "@/shared/lib/utils"
import { formatBRL } from "@/features/cashier/lib/money"
import type { OverviewAnalytics } from "../hooks/use-overview-analytics"

function fmtDay(iso: string): string {
  // `day` vem como YYYY-MM-DD.
  const [, m, d] = iso.split("-")
  return `${d}/${m}`
}

function Kpi({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string
  value: string
  icon: typeof TrendingUp
  tone?: "positive" | "negative" | "neutral"
}) {
  return (
    <div className="rounded-xl border border-foreground/[0.06] bg-foreground/[0.02] p-4">
      <div className="flex items-center gap-1.5 text-xs text-foreground/50">
        <Icon className="h-3.5 w-3.5 text-orange-400" />
        {label}
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

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ value: number }>
  label?: string
}) {
  const point = payload?.[0]
  if (!active || !point) return null
  return (
    <div className="rounded-md border border-border bg-popover px-2.5 py-1.5 text-xs shadow-lg">
      <p className="text-foreground/50">{label ? fmtDay(label) : ""}</p>
      <p className="font-medium text-foreground">{formatBRL(point.value)}</p>
    </div>
  )
}

export function AnalyticsSection({
  data,
  loading,
}: {
  data?: OverviewAnalytics
  loading: boolean
}) {
  const resultado = data?.resultadoCents ?? 0

  return (
    <section className="grid gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Kpi
          label="Resultado"
          value={formatBRL(resultado)}
          icon={TrendingUp}
          tone={resultado >= 0 ? "positive" : "negative"}
        />
        <Kpi
          label="Receita"
          value={formatBRL(data?.receitaCents ?? 0)}
          icon={ArrowUpRight}
          tone="positive"
        />
        <Kpi
          label="Despesa"
          value={formatBRL(data?.despesaCents ?? 0)}
          icon={ArrowDownRight}
          tone="negative"
        />
        <Kpi
          label="Serviços"
          value={String(data?.servicesCount ?? 0)}
          icon={Package}
        />
        <Kpi
          label="Ticket médio"
          value={formatBRL(data?.avgTicketCents ?? 0)}
          icon={Receipt}
        />
        <Kpi
          label="Novos clientes"
          value={String(data?.newCustomersCount ?? 0)}
          icon={UserPlus}
        />
      </div>

      {/* Custo & lucro por período (RPT-3) */}
      <div className="rounded-xl border border-foreground/[0.06] bg-foreground/[0.02] p-5">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
          <PiggyBank className="h-4 w-4 text-orange-400" />
          Custo &amp; lucro dos serviços
        </h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi
            label="Receita de serviços"
            value={formatBRL(data?.serviceRevenueCents ?? 0)}
            icon={Receipt}
            tone="positive"
          />
          <Kpi
            label="Custo de material"
            value={formatBRL(data?.materialCostCents ?? 0)}
            icon={Boxes}
            tone="negative"
          />
          <Kpi
            label="Lucro"
            value={formatBRL(data?.profitCents ?? 0)}
            icon={TrendingUp}
            tone={(data?.profitCents ?? 0) >= 0 ? "positive" : "negative"}
          />
          <Kpi
            label="Margem"
            value={`${(data?.marginPercent ?? 0).toLocaleString("pt-BR", {
              maximumFractionDigits: 1,
            })}%`}
            icon={Percent}
            tone={(data?.marginPercent ?? 0) >= 0 ? "positive" : "negative"}
          />
        </div>
        <p className="mt-3 text-xs text-foreground/40">
          Lucro = receita dos serviços não cancelados − custo dos materiais
          consumidos (materiais sem custo cadastrado não entram).
        </p>
      </div>

      <div className="rounded-xl border border-foreground/[0.06] bg-foreground/[0.02] p-5">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
          <TrendingUp className="h-4 w-4 text-orange-400" />
          Saldo no período
        </h2>
        {loading ? (
          <div className="flex h-56 items-center justify-center text-foreground/30">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        ) : !data || data.series.length === 0 ? (
          <p className="flex h-56 items-center justify-center text-sm text-foreground/30">
            Sem movimentação no período.
          </p>
        ) : (
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={data.series}
                margin={{ top: 4, right: 8, bottom: 0, left: 8 }}
              >
                <defs>
                  <linearGradient id="balanceFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="day"
                  tickFormatter={fmtDay}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={24}
                />
                <YAxis
                  tickFormatter={(v: number) => formatBRL(v).replace("R$", "").trim()}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={56}
                />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="totalCents"
                  stroke="var(--chart-2)"
                  strokeWidth={2}
                  fill="url(#balanceFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </section>
  )
}
