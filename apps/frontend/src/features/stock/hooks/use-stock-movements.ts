"use client"

import { useQuery } from "@tanstack/react-query"
import { apiRequest } from "@/infrastructure/api/client"
import { queryKeys } from "@/infrastructure/query/query-keys"
import type { StockMovement } from "../types"

export function useStockMovements(
  orgId: string,
  materialId: string | null,
  options?: { limit?: number; offset?: number },
) {
  const limit = options?.limit ?? 20
  const offset = options?.offset ?? 0

  const { data = [], isLoading, error, refetch } = useQuery({
    queryKey: [
      ...queryKeys.materials.movements(orgId, materialId ?? ""),
      { limit, offset },
    ],
    queryFn: () => {
      const params = new URLSearchParams({
        limit: String(limit),
        offset: String(offset),
      })
      return apiRequest<StockMovement[]>(
        `/orgs/${orgId}/materials/${materialId}/movements?${params.toString()}`,
      )
    },
    // Only fetch when both orgId and materialId are present
    enabled: !!orgId && !!materialId,
  })

  return {
    movements: data,
    loading: isLoading,
    error: error instanceof Error ? error.message : null,
    refetch,
  }
}
