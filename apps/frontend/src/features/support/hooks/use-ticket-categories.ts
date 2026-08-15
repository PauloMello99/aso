"use client"

import { useQuery } from "@tanstack/react-query"
import { queryKeys } from "@/infrastructure/query/query-keys"
import { listCategories } from "../api/support.api"

export function useTicketCategories(orgId: string) {
  const { data = [], isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.support.categories(orgId),
    queryFn: () => listCategories(orgId),
    enabled: !!orgId,
  })

  return {
    categories: data,
    loading: isLoading,
    error: error instanceof Error ? error.message : null,
    refetch,
  }
}
