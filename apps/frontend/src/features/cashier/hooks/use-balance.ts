"use client"

import { useQuery } from "@tanstack/react-query"
import { apiRequest } from "@/infrastructure/api/client"
import { queryKeys } from "@/infrastructure/query/query-keys"
import type { Balance } from "../types"

interface UseBalanceOptions {
  enabled?: boolean
}

export function useBalance(orgId: string, options?: UseBalanceOptions) {
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.cashier.balance(orgId),
    queryFn: () => apiRequest<Balance>(`/orgs/${orgId}/cashier/balance`),
    enabled: !!orgId && (options?.enabled ?? true),
  })

  return {
    balance: data ?? { cashCents: 0, digitalCents: 0, totalCents: 0 },
    loading: isLoading,
    error: error instanceof Error ? error.message : null,
  }
}
