"use client"

import { useQuery } from "@tanstack/react-query"
import { apiRequest } from "@/infrastructure/api/client"
import { queryKeys } from "@/infrastructure/query/query-keys"
import type { CustomerOption } from "../types"

interface CustomerOptionsResponse {
  data: CustomerOption[]
  truncated: boolean
}

export function useCustomerOptions(orgId: string) {
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.customers.options(orgId),
    queryFn: () =>
      apiRequest<CustomerOptionsResponse>(`/orgs/${orgId}/customers/options`),
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000,
  })

  return {
    options: data?.data ?? [],
    truncated: data?.truncated ?? false,
    loading: isLoading,
    error: error instanceof Error ? error.message : null,
  }
}
