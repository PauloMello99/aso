"use client"

import * as React from "react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Loader2 } from "lucide-react"
import { PAYMENT_METHOD_LABELS, type PaymentMethod } from "@/features/cashier/types"
import { cn } from "@/shared/lib/utils"
import { useHideValues } from "@/shared/components/hide-values-provider"
import { useMoneyFormatter } from "@/shared/hooks/use-money-formatter"
import type {
  DailyBalancePoint,
  IncomeExpensePoint,
  PaymentMethodTotal,
  ServiceGroupRow,
} from "../hooks/use-overview-analytics"
import { formatAxisMoney, seriesLabel, truncateTick } from "../lib/chart-format"

const INCOME = "var(--success)"
const EXPENSE = "var(--destructive)"
const SLICE_COLORS = [
  "var(--chart-2)",
  "var(--chart-1)",
  "var(--chart-4)",
  "var(--chart-3)",
  "var(--chart-5)",
]

function fmtDay(iso: string): string {
  const [, m, d] = iso.split("-")
  return `${d}/${m}`
}

// Largura do eixo de valor: comporta "-150 mil"/"-1,5 mi" (formato compacto).
const VALUE_AXIS_WIDTH = 52
// Largura do eixo de categorias (barras horizontais) + limite de caracteres do
// rótulo, para nomes longos não invadirem as barras nem se sobreporem.
const CATEGORY_AXIS_WIDTH = 84
const CATEGORY_TICK_MAX_CHARS = 12

export function ChartCard({
  title,
  badge,
  loading,
  isEmpty,
  emptyLabel = "Sem dados no período.",
  className,
  children,
}: {
  title: string
  badge?: string
  loading: boolean
  isEmpty: boolean
  emptyLabel?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div
      className={cn(
        "min-w-0 rounded-xl border border-foreground/[0.06] bg-foreground/[0.02] p-4 sm:p-5",
        className,
      )}
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">{title}</h3>
        {badge && (
          <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary">
            {badge}
          </span>
        )}
      </div>
      {loading ? (
        <div className="flex h-48 items-center justify-center text-foreground/30">
          <Loader2 className="h-4 w-4 animate-spin" />
        </div>
      ) : isEmpty ? (
        <p className="flex h-48 items-center justify-center text-center text-sm text-foreground/30">
          {emptyLabel}
        </p>
      ) : (
        <div className="h-48 w-full">{children}</div>
      )}
    </div>
  )
}

function MoneyTooltip({
  active,
  payload,
  label,
  formatLabel,
}: {
  active?: boolean
  payload?: Array<{ value: number; name?: string; color?: string }>
  label?: string
  formatLabel?: (l: string) => string
}) {
  // Formatter mascarável: com "Ocultar valores" o tooltip não vaza o valor.
  const money = useMoneyFormatter()
  if (!active || !payload?.length) return null
  return (
    <div className="max-w-[16rem] rounded-md border border-border bg-popover px-2.5 py-1.5 text-xs shadow-lg">
      {label !== undefined && (
        <p className="mb-0.5 break-words text-foreground/50">
          {formatLabel ? formatLabel(label) : label}
        </p>
      )}
      {payload.map((p, i) => (
        <p key={i} className="font-medium text-foreground">
          {p.name ? `${seriesLabel(p.name)}: ` : ""}
          {money(p.value)}
        </p>
      ))}
    </div>
  )
}

const AXIS_TICK = { fill: "var(--muted-foreground)", fontSize: 11 }

export function BalanceAreaChart({ series }: { series: DailyBalancePoint[] }) {
  const { hidden } = useHideValues()
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={series} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="balanceFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="day"
          tickFormatter={fmtDay}
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={false}
          minTickGap={24}
        />
        <YAxis
          tickFormatter={(v: number) => formatAxisMoney(v, hidden)}
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={false}
          width={VALUE_AXIS_WIDTH}
        />
        <Tooltip content={<MoneyTooltip formatLabel={fmtDay} />} />
        <Area
          type="monotone"
          dataKey="totalCents"
          name="Saldo"
          stroke="var(--chart-2)"
          strokeWidth={2}
          fill="url(#balanceFill)"
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export function IncomeExpenseChart({ data }: { data: IncomeExpensePoint[] }) {
  const { hidden } = useHideValues()
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
        <XAxis
          dataKey="day"
          tickFormatter={fmtDay}
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={false}
          minTickGap={24}
        />
        <YAxis
          tickFormatter={(v: number) => formatAxisMoney(v, hidden)}
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={false}
          width={VALUE_AXIS_WIDTH}
        />
        <Tooltip
          cursor={{ fill: "var(--foreground)", fillOpacity: 0.04 }}
          content={<MoneyTooltip formatLabel={fmtDay} />}
        />
        <Bar dataKey="incomeCents" name="Entradas" fill={INCOME} radius={[3, 3, 0, 0]} />
        <Bar dataKey="expenseCents" name="Saídas" fill={EXPENSE} radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function HorizontalRevenueChart({ data }: { data: ServiceGroupRow[] }) {
  const { hidden } = useHideValues()
  const top = data.slice(0, 6)
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        layout="vertical"
        data={top}
        margin={{ top: 4, right: 16, bottom: 0, left: 0 }}
      >
        <XAxis
          type="number"
          tickFormatter={(v: number) => formatAxisMoney(v, hidden)}
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={false}
          tickCount={4}
          minTickGap={16}
        />
        <YAxis
          type="category"
          dataKey="name"
          tickFormatter={(v: string) =>
            truncateTick(v, CATEGORY_TICK_MAX_CHARS)
          }
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={false}
          width={CATEGORY_AXIS_WIDTH}
          interval={0}
        />
        <Tooltip
          cursor={{ fill: "var(--foreground)", fillOpacity: 0.04 }}
          content={<MoneyTooltip />}
        />
        <Bar dataKey="revenueCents" name="Receita" fill="var(--chart-2)" radius={[0, 3, 3, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function PaymentMethodsChart({ data }: { data: PaymentMethodTotal[] }) {
  const rows = data.map((d) => ({
    name: PAYMENT_METHOD_LABELS[d.paymentMethod as PaymentMethod] ?? d.paymentMethod,
    value: d.netCents,
  }))
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={rows}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={38}
          outerRadius={62}
          paddingAngle={2}
          stroke="var(--background)"
          strokeWidth={2}
        >
          {rows.map((_, i) => (
            <Cell key={i} fill={SLICE_COLORS[i % SLICE_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip content={<MoneyTooltip />} />
        <Legend
          verticalAlign="bottom"
          height={24}
          iconType="circle"
          iconSize={8}
          formatter={(v: string) => (
            <span style={{ color: "var(--muted-foreground)", fontSize: 11 }}>
              {v}
            </span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
