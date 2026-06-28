"use client"

import { Building2, Ban, Users, ShieldCheck, Network, Loader2 } from "lucide-react"
import { useAdminStats } from "../hooks/use-admin"

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
        <Icon className="h-3.5 w-3.5 text-orange-400" />
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

export function AdminOverview() {
  const { stats, loading, error } = useAdminStats()

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
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard
          label="Organizações"
          value={stats?.totalOrgs ?? 0}
          icon={Building2}
          loading={loading}
        />
        <StatCard
          label="Suspensas"
          value={stats?.suspendedOrgs ?? 0}
          icon={Ban}
          loading={loading}
        />
        <StatCard
          label="Usuários"
          value={stats?.totalUsers ?? 0}
          icon={Users}
          loading={loading}
        />
        <StatCard
          label="Super admins"
          value={stats?.superAdmins ?? 0}
          icon={ShieldCheck}
          loading={loading}
        />
        <StatCard
          label="Memberships"
          value={stats?.totalMemberships ?? 0}
          icon={Network}
          loading={loading}
        />
      </div>

      {loading && (
        <div className="flex items-center justify-center py-8 text-foreground/30">
          <Loader2 className="h-4 w-4 animate-spin" />
        </div>
      )}
    </div>
  )
}
