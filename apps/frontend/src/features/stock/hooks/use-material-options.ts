"use client"

import { useQuery } from "@tanstack/react-query"
import { apiRequest } from "@/infrastructure/api/client"
import { queryKeys } from "@/infrastructure/query/query-keys"
import type { Material } from "../types"

interface MaterialOptionsResponse {
  data: Material[]
  truncated: boolean
}

export function useMaterialOptions(orgId: string) {
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.materials.options(orgId),
    queryFn: () =>
      apiRequest<MaterialOptionsResponse>(`/orgs/${orgId}/materials/options`),
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
