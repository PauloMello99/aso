"use client"

import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { apiRequest } from "@/infrastructure/api/client"
import { queryKeys } from "@/infrastructure/query/query-keys"
import type { Paginated } from "@/shared/types/pagination"
import type { StockMovement } from "../types"

export function useStockMovements(
  orgId: string,
  materialId: string | null,
  options?: { page?: number; limit?: number },
) {
  const page = options?.page ?? 1
  const limit = options?.limit ?? 20

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.materials.movements(orgId, materialId ?? "", { page, limit }),
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) })
      return apiRequest<Paginated<StockMovement>>(
        `/orgs/${orgId}/materials/${materialId}/movements?${params.toString()}`,
      )
    },
    enabled: !!orgId && !!materialId,
    placeholderData: keepPreviousData,
  })

  return {
    movements: data?.data ?? [],
    total: data?.total ?? 0,
    page: data?.page ?? 1,
    pages: data?.pages ?? 0,
    loading: isLoading,
    error: error instanceof Error ? error.message : null,
    refetch,
  }
}
