"use client"

import { useQuery } from "@tanstack/react-query"
import { apiRequest } from "@/infrastructure/api/client"
import { queryKeys } from "@/infrastructure/query/query-keys"
import { monthKey, monthRange, type MonthRef } from "../lib/month-range"

export interface DailyBalancePoint {
  day: string
  cashCents: number
  digitalCents: number
  totalCents: number
}

export interface KpiWithDelta {
  current: number
  previous: number
  deltaPercent: number | null
}

export interface ServiceGroupRow {
  name: string
  count: number
  revenueCents: number
  commissionCents: number
}

export interface PaymentMethodTotal {
  paymentMethod: "cash" | "bank_transfer" | "credit_card" | "debit_card"
  netCents: number
}

export interface MaterialConsumption {
  materialId: string
  name: string
  quantity: number
  costCents: number | null
}

export interface OverviewAnalytics {
  role: "owner" | "employee"
  from: string
  to: string
  servicesCount: KpiWithDelta
  serviceRevenueCents: KpiWithDelta
  avgTicketCents: KpiWithDelta
  commissionCents?: KpiWithDelta
  receitaCents?: KpiWithDelta
  despesaCents?: KpiWithDelta
  resultadoCents?: KpiWithDelta
  newCustomersCount?: KpiWithDelta
  margin?: {
    serviceRevenueCents: number
    materialCostCents: number
    profitCents: number
    marginPercent: number
  }
  series?: DailyBalancePoint[]
  servicesByType?: ServiceGroupRow[]
  revenueByProfessional?: ServiceGroupRow[]
  paymentMethods?: PaymentMethodTotal[]
  materialsConsumption?: MaterialConsumption[]
}

interface UseOverviewAnalyticsOptions {
  enabled?: boolean
}

export function useOverviewAnalytics(
  orgId: string,
  month: MonthRef,
  options?: UseOverviewAnalyticsOptions,
) {
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.overview.analytics(orgId, monthKey(month)),
    // from/to calculados no fetch (mês corrente termina em "agora"); a key é só YYYY-MM.
    queryFn: () => {
      const { from, to } = monthRange(month, new Date())
      const params = new URLSearchParams({ from, to })
      return apiRequest<OverviewAnalytics>(
        `/orgs/${orgId}/overview/analytics?${params.toString()}`,
      )
    },
    enabled: !!orgId && (options?.enabled ?? true),
  })

  return {
    data,
    loading: isLoading,
    error: error instanceof Error ? error.message : null,
  }
}
