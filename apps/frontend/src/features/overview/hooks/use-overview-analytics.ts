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

export interface KpiWithDelta {
  current: number
  previous: number
  deltaPercent: number | null
}

export interface ServiceGroupRow {
  name: string
  count: number
  revenueCents: number
}

export interface PaymentMethodTotal {
  paymentMethod: "cash" | "bank_transfer" | "credit_card" | "debit_card"
  netCents: number
}

export interface IncomeExpensePoint {
  day: string
  incomeCents: number
  expenseCents: number
}

export interface OverviewAnalytics {
  role: "owner" | "employee"
  from: string
  to: string
  servicesCount: KpiWithDelta
  serviceRevenueCents: KpiWithDelta
  avgTicketCents: KpiWithDelta
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
  incomeExpenseSeries?: IncomeExpensePoint[]
}

export interface AnalyticsPeriod {
  from?: string
  to?: string
}

interface UseOverviewAnalyticsOptions {
  enabled?: boolean
}

export function useOverviewAnalytics(
  orgId: string,
  period: AnalyticsPeriod,
  options?: UseOverviewAnalyticsOptions,
) {
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.overview.analytics(orgId, period.from, period.to),
    queryFn: () => {
      const params = new URLSearchParams()
      if (period.from) params.set("from", period.from)
      if (period.to) params.set("to", period.to)
      const qs = params.toString() ? `?${params.toString()}` : ""
      return apiRequest<OverviewAnalytics>(
        `/orgs/${orgId}/overview/analytics${qs}`,
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
