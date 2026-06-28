"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiRequest } from "@/infrastructure/api/client"
import type { TransactionCategory } from "../types"

const EMPTY: TransactionCategory[] = []

export function useTransactionCategories(orgId: string) {
  const queryClient = useQueryClient()
  const key = ["cashier", orgId, "categories"] as const

  const { data, isLoading } = useQuery({
    queryKey: key,
    queryFn: () =>
      apiRequest<TransactionCategory[]>(`/orgs/${orgId}/cashier/categories`),
    enabled: !!orgId,
  })

  const createMutation = useMutation({
    mutationFn: (name: string) =>
      apiRequest<TransactionCategory>(`/orgs/${orgId}/cashier/categories`, {
        method: "POST",
        body: JSON.stringify({ name }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: key })
    },
  })

  return {
    categories: data ?? EMPTY,
    loading: isLoading,
    createCategory: (name: string) => createMutation.mutateAsync(name),
  }
}
