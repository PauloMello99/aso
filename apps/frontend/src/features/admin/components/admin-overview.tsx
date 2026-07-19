"use client"

import * as React from "react"
import {
  Building2,
  Ban,
  Users,
  ShieldCheck,
  Network,
  TrendingUp,
} from "lucide-react"
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { useAdminStats, useAdminGrowth } from "../hooks/use-admin"
import { fmtMonth } from "../lib/format"
import { usePrefersReducedMotion } from "../lib/use-prefers-reduced-motion"

const COLORS = {
  orgs: "var(--chart-1)",
  users: "var(--chart-5)",
  active: "var(--chart-2)",
  suspended: "var(--destructive)",
  axis: "rgba(255,255,255,0.4)",
  grid: "rgba(255,255,255,0.06)",
}

function StatCard({
  label,
  value,
  icon: Icon,
  loading,
}: {
  label: string
  value: number
  icon: typeof Building2
  loading: boolean
}) {
  return (
    <div className="rounded-xl border border-foreground/[0.06] bg-foreground/[0.02] p-4">
      <div className="flex items-center gap-1.5 text-xs text-foreground/50">
        <Icon className="h-3.5 w-3.5 text-primary" />
        {label}
      </div>
      {loading ? (
        <div className="mt-2 h-7 w-12 animate-pulse rounded bg-foreground/[0.06]" />
      ) : (
        <p className="mt-1.5 text-2xl font-semibold tabular-nums text-foreground">
          {value}
        </p>
      )}
    </div>
  )
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: { name?: string; value?: number; color?: string }[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-foreground/10 bg-popover px-3 py-2 text-xs shadow-xl">
      {label && <p className="mb-1 font-medium text-foreground">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} className="flex items-center gap-1.5 text-foreground/70">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: p.color }}
          />
          {p.name}: <span className="tabular-nums text-foreground">{p.value}</span>
        </p>
      ))}
    </div>
  )
}

export function AdminOverview() {
  const { stats, loading, error } = useAdminStats()
  const { series, loading: growthLoading } = useAdminGrowth()
  const reducedMotion = usePrefersReducedMotion()

  const growthData = series.map((p) => ({
    month: fmtMonth(p.month),
    Organizações: p.newOrgs,
    Usuários: p.newUsers,
  }))
  const hasGrowth = series.some((p) => p.newOrgs > 0 || p.newUsers > 0)

  const activeOrgs = (stats?.totalOrgs ?? 0) - (stats?.suspendedOrgs ?? 0)
  const statusData = [
    { name: "Ativas", value: activeOrgs, color: COLORS.active },
    { name: "Suspensas", value: stats?.suspendedOrgs ?? 0, color: COLORS.suspended },
  ]
  const hasOrgs = (stats?.totalOrgs ?? 0) > 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-foreground">
          Painel da plataforma
        </h1>
        <p className="mt-0.5 text-sm text-foreground/40">
          Visão global de organizações, usuários e acessos (super_admin).
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Organizações" value={stats?.totalOrgs ?? 0} icon={Building2} loading={loading} />
        <StatCard label="Suspensas" value={stats?.suspendedOrgs ?? 0} icon={Ban} loading={loading} />
        <StatCard label="Usuários" value={stats?.totalUsers ?? 0} icon={Users} loading={loading} />
        <StatCard label="Super admins" value={stats?.superAdmins ?? 0} icon={ShieldCheck} loading={loading} />
        <StatCard label="Memberships" value={stats?.totalMemberships ?? 0} icon={Network} loading={loading} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-foreground/[0.06] bg-foreground/[0.02] p-4 lg:col-span-2">
          <div className="mb-3 flex items-center gap-1.5 text-sm font-medium text-foreground">
            <TrendingUp className="h-4 w-4 text-primary" />
            Crescimento · novos por mês (12 meses)
          </div>
          {growthLoading ? (
            <div className="h-64 animate-pulse rounded-lg bg-foreground/[0.04]" />
          ) : hasGrowth ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={growthData} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                  <defs>
                    <linearGradient id="gOrgs" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={COLORS.orgs} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={COLORS.orgs} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gUsers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={COLORS.users} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={COLORS.users} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={COLORS.grid} vertical={false} />
                  <XAxis dataKey="month" tick={{ fill: COLORS.axis, fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} tick={{ fill: COLORS.axis, fontSize: 11 }} tickLine={false} axisLine={false} width={32} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Area type="monotone" dataKey="Organizações" stroke={COLORS.orgs} fill="url(#gOrgs)" strokeWidth={2} isAnimationActive={!reducedMotion} />
                  <Area type="monotone" dataKey="Usuários" stroke={COLORS.users} fill="url(#gUsers)" strokeWidth={2} isAnimationActive={!reducedMotion} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-64 items-center justify-center text-sm text-foreground/40">
              Sem cadastros nos últimos 12 meses.
            </div>
          )}
        </div>

        <div className="rounded-xl border border-foreground/[0.06] bg-foreground/[0.02] p-4">
          <div className="mb-3 flex items-center gap-1.5 text-sm font-medium text-foreground">
            <Building2 className="h-4 w-4 text-primary" />
            Organizações por status
          </div>
          {loading ? (
            <div className="h-64 animate-pulse rounded-lg bg-foreground/[0.04]" />
          ) : hasOrgs ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={2}
                    isAnimationActive={!reducedMotion}
                  >
                    {statusData.map((d) => (
                      <Cell key={d.name} fill={d.color} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-64 items-center justify-center text-sm text-foreground/40">
              Nenhuma organização ainda.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
