"use client"

import * as React from "react"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Legend,
  Line,
  LineChart,
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
  MaterialConsumption,
  PaymentMethodTotal,
  ServiceGroupRow,
} from "../hooks/use-overview-analytics"
import {
  formatAxisMoney,
  formatQuantity,
  seriesLabel,
  truncateTick,
} from "../lib/chart-format"
import { computeShares } from "../lib/payment-share"

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
// Barras verticais: rótulo curto, pois cada categoria tem pouca largura.
const VERTICAL_TICK_MAX_CHARS = 7

export function ChartCard({
  title,
  badge,
  actions,
  loading,
  isEmpty,
  emptyLabel = "Sem dados no período.",
  className,
  contentClassName,
  children,
}: {
  title: string
  badge?: string
  actions?: React.ReactNode
  loading: boolean
  isEmpty: boolean
  emptyLabel?: string
  className?: string
  contentClassName?: string
  children: React.ReactNode
}) {
  return (
    <div
      className={cn(
        "min-w-0 rounded-xl border border-foreground/[0.06] bg-foreground/[0.02] p-4 sm:p-5",
        className,
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="min-w-0 truncate text-sm font-medium text-foreground">
          {title}
        </h3>
        <div className="flex shrink-0 items-center gap-2">
          {badge && (
            <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary">
              {badge}
            </span>
          )}
          {actions}
        </div>
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
        <div className={cn("h-48 w-full", contentClassName)}>{children}</div>
      )}
    </div>
  )
}

/** Alternador compacto de exibição (segmented control) para o cabeçalho do card. */
export function ViewToggle<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T
  options: ReadonlyArray<{ value: T; label: string }>
  onChange: (v: T) => void
  label: string
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="flex gap-0.5 rounded-lg border border-foreground/[0.06] p-0.5"
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={cn(
            "rounded-md px-2 py-1 text-[11px] font-medium transition-colors",
            value === o.value
              ? "bg-foreground/[0.08] text-foreground"
              : "text-foreground/50 hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
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

export function BalanceAreaChart({
  series,
  variant = "area",
}: {
  series: DailyBalancePoint[]
  variant?: "area" | "line"
}) {
  const { hidden } = useHideValues()
  const margin = { top: 4, right: 8, bottom: 0, left: 0 }
  const axes = (
    <>
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
    </>
  )

  if (variant === "line") {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={series} margin={margin}>
          {axes}
          <Line
            type="monotone"
            dataKey="totalCents"
            name="Saldo"
            stroke="var(--chart-2)"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    )
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={series} margin={margin}>
        <defs>
          <linearGradient id="balanceFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0} />
          </linearGradient>
        </defs>
        {axes}
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

export function RevenueBarChart({
  data,
  orientation = "horizontal",
}: {
  data: ServiceGroupRow[]
  orientation?: "horizontal" | "vertical"
}) {
  const { hidden } = useHideValues()
  const top = data.slice(0, 6)
  const horizontal = orientation === "horizontal"
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        layout={horizontal ? "vertical" : "horizontal"}
        data={top}
        margin={{ top: 4, right: 16, bottom: 0, left: 0 }}
      >
        <XAxis
          type={horizontal ? "number" : "category"}
          dataKey={horizontal ? undefined : "name"}
          tickFormatter={
            horizontal
              ? (v: number) => formatAxisMoney(v, hidden)
              : (v: string) => truncateTick(v, VERTICAL_TICK_MAX_CHARS)
          }
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={false}
          tickCount={horizontal ? 4 : undefined}
          interval={horizontal ? "preserveEnd" : 0}
          minTickGap={16}
        />
        <YAxis
          type={horizontal ? "category" : "number"}
          dataKey={horizontal ? "name" : undefined}
          tickFormatter={
            horizontal
              ? (v: string) => truncateTick(v, CATEGORY_TICK_MAX_CHARS)
              : (v: number) => formatAxisMoney(v, hidden)
          }
          tick={AXIS_TICK}
          tickLine={false}
          axisLine={false}
          width={horizontal ? CATEGORY_AXIS_WIDTH : VALUE_AXIS_WIDTH}
          interval={horizontal ? 0 : "preserveEnd"}
        />
        <Tooltip
          cursor={{ fill: "var(--foreground)", fillOpacity: 0.04 }}
          content={<MoneyTooltip />}
        />
        <Bar
          dataKey="revenueCents"
          name="Receita"
          fill="var(--chart-2)"
          radius={horizontal ? [0, 3, 3, 0] : [3, 3, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}

function MaterialsTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: Array<{ payload: MaterialConsumption }>
}) {
  const money = useMoneyFormatter()
  const first = payload?.[0]
  if (!active || !first) return null
  const m = first.payload
  return (
    <div className="max-w-[16rem] rounded-md border border-border bg-popover px-2.5 py-1.5 text-xs shadow-lg">
      <p className="mb-0.5 break-words text-foreground/50">{m.name}</p>
      <p className="font-medium text-foreground">
        Quantidade: {formatQuantity(m.quantity)}
      </p>
      {m.costCents !== null && (
        <p className="font-medium text-foreground">
          Custo estimado: {money(m.costCents)}
        </p>
      )}
    </div>
  )
}

export function MaterialsBarChart({ data }: { data: MaterialConsumption[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        layout="vertical"
        data={data.slice(0, 6)}
        margin={{ top: 4, right: 16, bottom: 0, left: 0 }}
      >
        <XAxis
          type="number"
          tickFormatter={(v: number) => formatQuantity(v)}
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
          content={<MaterialsTooltip />}
        />
        <Bar
          dataKey="quantity"
          name="Quantidade"
          fill="var(--chart-1)"
          radius={[0, 3, 3, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function MaterialsList({ data }: { data: MaterialConsumption[] }) {
  const money = useMoneyFormatter()
  return (
    <ul className="h-full divide-y divide-foreground/[0.05] overflow-y-auto">
      {data.slice(0, 6).map((m) => (
        <li
          key={m.materialId}
          className="flex items-center justify-between gap-3 py-1.5 text-sm"
        >
          <span className="min-w-0 flex-1 truncate text-foreground">
            {m.name}
          </span>
          <span className="shrink-0 tabular-nums text-foreground/60">
            {formatQuantity(m.quantity)}
          </span>
          <span className="min-w-[4.5rem] shrink-0 text-right tabular-nums text-foreground">
            {m.costCents !== null ? money(m.costCents) : "—"}
          </span>
        </li>
      ))}
    </ul>
  )
}

function paymentRows(data: PaymentMethodTotal[]) {
  return data.map((d) => ({
    name:
      PAYMENT_METHOD_LABELS[d.paymentMethod as PaymentMethod] ?? d.paymentMethod,
    value: d.netCents,
  }))
}

function PaymentDonut({
  data,
  showLegend,
}: {
  data: PaymentMethodTotal[]
  showLegend: boolean
}) {
  const rows = paymentRows(data)
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
        {showLegend && (
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
        )}
      </PieChart>
    </ResponsiveContainer>
  )
}

function PaymentList({ data }: { data: PaymentMethodTotal[] }) {
  const money = useMoneyFormatter()
  const shares = computeShares(
    paymentRows(data).map((r) => ({ name: r.name, cents: r.value })),
  )
  return (
    <ul className="divide-y divide-foreground/[0.05]">
      {shares.map((s, i) => (
        <li key={s.name} className="flex items-center gap-2 py-1.5 text-sm">
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: SLICE_COLORS[i % SLICE_COLORS.length] }}
          />
          <span className="min-w-0 flex-1 truncate text-foreground">
            {s.name}
          </span>
          <span className="shrink-0 tabular-nums text-foreground">
            {money(s.cents)}
          </span>
          <span className="w-12 shrink-0 text-right text-xs tabular-nums text-foreground/50">
            {s.percent.toLocaleString("pt-BR", {
              minimumFractionDigits: 1,
              maximumFractionDigits: 1,
            })}
            %
          </span>
        </li>
      ))}
    </ul>
  )
}

export function PaymentMethodsView({
  data,
  view,
}: {
  data: PaymentMethodTotal[]
  view: "both" | "donut" | "list"
}) {
  if (view === "donut") return <PaymentDonut data={data} showLegend />
  if (view === "list") {
    return (
      <div className="h-full overflow-y-auto">
        <PaymentList data={data} />
      </div>
    )
  }
  return (
    <div className="grid grid-cols-1 items-center gap-3 sm:grid-cols-2">
      <div className="h-44 w-full">
        <PaymentDonut data={data} showLegend={false} />
      </div>
      <PaymentList data={data} />
    </div>
  )
}
