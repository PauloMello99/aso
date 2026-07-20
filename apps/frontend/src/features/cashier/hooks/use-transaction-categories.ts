"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiRequest } from "@/infrastructure/api/client"
import { queryKeys } from "@/infrastructure/query/query-keys"
import type { TransactionCategory } from "../types"

const EMPTY: TransactionCategory[] = []

export function useTransactionCategories(orgId: string) {
  const queryClient = useQueryClient()
  const key = queryKeys.cashier.categories(orgId)

  const { data, isLoading } = useQuery({
    queryKey: key,
    queryFn: () =>
      apiRequest<TransactionCategory[]>(`/orgs/${orgId}/cashier/categories`),
    enabled: !!orgId,
  })

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: key })
    void queryClient.invalidateQueries({
      queryKey: queryKeys.cashier.all(orgId),
    })
  }

  const createMutation = useMutation({
    mutationFn: (name: string) =>
      apiRequest<TransactionCategory>(`/orgs/${orgId}/cashier/categories`, {
        method: "POST",
        body: JSON.stringify({ name }),
      }),
    onSuccess: invalidate,
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      apiRequest<TransactionCategory>(
        `/orgs/${orgId}/cashier/categories/${id}`,
        {
          method: "PUT",
          body: JSON.stringify({ name }),
        },
      ),
    onSuccess: invalidate,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest<void>(`/orgs/${orgId}/cashier/categories/${id}`, {
        method: "DELETE",
      }),
    onSuccess: invalidate,
  })

  return {
    categories: data ?? EMPTY,
    loading: isLoading,
    createCategory: (name: string) => createMutation.mutateAsync(name),
    updateCategory: (id: string, name: string) =>
      updateMutation.mutateAsync({ id, name }),
    deleteCategory: (id: string) => deleteMutation.mutateAsync(id),
  }
}
