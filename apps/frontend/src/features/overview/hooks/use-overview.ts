"use client"

import { useQuery } from "@tanstack/react-query"
import { apiRequest } from "@/infrastructure/api/client"
import { queryKeys } from "@/infrastructure/query/query-keys"
import { monthKey, monthRange, type MonthRef } from "../lib/month-range"
import type { Service } from "@/features/services/types"
import type { CalendarEvent } from "@/features/agenda/types"
import type { Material } from "@/features/stock/types"
import type { Customer } from "@/features/clients/types"
import type { TransactionView, TransactionCategory } from "@/features/cashier/types"

export interface OverviewData {
  recentServices?: Service[]
  upcomingEvents?: CalendarEvent[]
  lowStock?: Material[]
  recentTransactions?: TransactionView[]
  transactionCategories?: TransactionCategory[]
  recentCustomers?: Customer[]
}

export function useOverview(orgId: string, month: MonthRef) {
  const key = monthKey(month)
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.overview.detail(orgId, key),
    // from/to calculados no fetch (mês corrente termina em "agora"); a key é só YYYY-MM.
    queryFn: () => {
      const { from, to } = monthRange(month, new Date())
      const params = new URLSearchParams({ from, to })
      return apiRequest<OverviewData>(
        `/orgs/${orgId}/overview?${params.toString()}`,
      )
    },
    enabled: !!orgId,
  })

  return {
    data,
    loading: isLoading,
    error: error instanceof Error ? error.message : null,
  }
}
