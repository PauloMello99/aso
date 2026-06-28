"use client"

import { useQuery } from "@tanstack/react-query"
import { apiRequest } from "@/infrastructure/api/client"
import { queryKeys } from "@/infrastructure/query/query-keys"
import type { Service } from "@/features/services/types"
import type { CalendarEvent } from "@/features/agenda/types"
import type { Material } from "@/features/stock/types"
import type { Customer } from "@/features/clients/types"
import type { TransactionView, TransactionCategory } from "@/features/cashier/types"

/**
 * Resposta agregada do Overview (PERF-2). Cada lista já vem ordenada e fatiada
 * pelo servidor; seções owner-only chegam vazias para funcionário.
 */
export interface OverviewData {
  recentServices: Service[]
  upcomingEvents: CalendarEvent[]
  lowStock: Material[]
  recentTransactions: TransactionView[]
  transactionCategories: TransactionCategory[]
  recentCustomers: Customer[]
}

export function useOverview(orgId: string) {
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.overview.detail(orgId),
    queryFn: () => apiRequest<OverviewData>(`/orgs/${orgId}/overview`),
    enabled: !!orgId,
  })

  return {
    data,
    loading: isLoading,
    error: error instanceof Error ? error.message : null,
  }
}
