"use client"

import { useQuery } from "@tanstack/react-query"
import { apiRequest } from "@/infrastructure/api/client"
import { queryKeys } from "@/infrastructure/query/query-keys"

export interface DailyBalancePoint {
  day: string
  cashCents: number
  digitalCents: number
  totalCents: number
}

/** KPIs + série temporal do estúdio (owner-only). PERF-3. */
export interface OverviewAnalytics {
  from: string
  to: string
  receitaCents: number
  despesaCents: number
  resultadoCents: number
  servicesCount: number
  avgTicketCents: number
  newCustomersCount: number
  /** Receita de serviços não cancelados no período (RPT-3). */
  serviceRevenueCents: number
  /** Custo dos materiais consumidos por esses serviços. */
  materialCostCents: number
  /** Lucro estimado = receita de serviços − custo de material. */
  profitCents: number
  /** Margem (0–100). */
  marginPercent: number
  series: DailyBalancePoint[]
}

export function useOverviewAnalytics(orgId: string, enabled: boolean) {
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.overview.analytics(orgId),
    queryFn: () =>
      apiRequest<OverviewAnalytics>(`/orgs/${orgId}/overview/analytics`),
    enabled: !!orgId && enabled,
  })

  return {
    data,
    loading: isLoading,
    error: error instanceof Error ? error.message : null,
  }
}
