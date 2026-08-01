"use client"

import { useQuery } from "@tanstack/react-query"
import { apiRequest } from "@/infrastructure/api/client"
import { queryKeys } from "@/infrastructure/query/query-keys"
import type { Customer } from "../types"

export function useCustomerDetail(orgId: string, customerId: string | undefined) {
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.customers.detail(orgId, customerId ?? ""),
    queryFn: () => apiRequest<Customer>(`/orgs/${orgId}/customers/${customerId}`),
    enabled: !!orgId && !!customerId,
  })

  return {
    customer: data ?? null,
    loading: isLoading,
    error: error instanceof Error ? error.message : null,
  }
}
