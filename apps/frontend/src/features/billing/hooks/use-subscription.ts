"use client"

import { useQuery } from "@tanstack/react-query"
import { apiRequest } from "@/infrastructure/api/client"
import { queryKeys } from "@/infrastructure/query/query-keys"
import type { Subscription } from "../types"

export function useSubscription(orgId: string) {
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.billing.subscription(orgId),
    queryFn: () => apiRequest<Subscription>(`/orgs/${orgId}/subscription`),
    enabled: !!orgId,
  })

  return {
    subscription: data ?? null,
    loading: isLoading,
    error: error instanceof Error ? error.message : null,
  }
}
