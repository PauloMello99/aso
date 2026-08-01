"use client"

import { useQuery } from "@tanstack/react-query"
import { apiRequest } from "@/infrastructure/api/client"
import { queryKeys } from "@/infrastructure/query/query-keys"
import type { Service } from "../types"

export function useService(orgId: string, serviceId: string | undefined) {
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.services.detail(orgId, serviceId ?? ""),
    queryFn: () => apiRequest<Service>(`/orgs/${orgId}/services/${serviceId}`),
    enabled: !!orgId && !!serviceId,
  })

  return {
    service: data ?? null,
    loading: isLoading,
    error: error instanceof Error ? error.message : null,
  }
}
