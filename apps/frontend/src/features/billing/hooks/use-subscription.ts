"use client"

import { useQuery } from "@tanstack/react-query"
import { ApiError, apiRequest } from "@/infrastructure/api/client"
import { queryKeys } from "@/infrastructure/query/query-keys"
import type { Subscription } from "../types"

export function useSubscription(orgId: string) {
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.billing.subscription(orgId),
    queryFn: () => apiRequest<Subscription>(`/orgs/${orgId}/subscription`),
    enabled: !!orgId,
    retry: false,
  })

  // A 404 means the org genuinely has no subscription row (locked). Any
  // other error (network/5xx) is transient/unknown and must not be treated
  // as the same "no subscription" state by callers.
  const notFound = error instanceof ApiError && error.status === 404

  return {
    subscription: data ?? null,
    loading: isLoading,
    notFound,
    error: error instanceof Error ? error.message : null,
  }
}
