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
