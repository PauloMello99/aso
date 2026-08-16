"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiRequest } from "@/infrastructure/api/client"
import { queryKeys } from "@/infrastructure/query/query-keys"
import { billingErrorMessage } from "@/features/admin/lib/billing-error-messages"
import type {
  BillingPlan,
  RotateBillingPlanPriceInput,
  SyncPlanCatalogReport,
  UpdateBillingPlanProductInput,
} from "@/features/billing/types"

export function useAdminBillingPlans() {
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.adminBilling.plans(),
    queryFn: () => apiRequest<BillingPlan[]>("/admin/billing/plans"),
  })

  return {
    plans: data ?? [],
    loading: isLoading,
    error: error ? billingErrorMessage(error) : null,
  }
}

function invalidatePlanQueries(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: queryKeys.adminBilling.plans() })
}

export function useSyncPlanCatalog() {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: () =>
      apiRequest<SyncPlanCatalogReport>("/admin/billing/plans/sync", {
        method: "POST",
      }),
    onSuccess: () => invalidatePlanQueries(queryClient),
  })

  return {
    syncCatalog: mutation.mutateAsync,
    report: mutation.data ?? null,
    isPending: mutation.isPending,
    error: mutation.error ? billingErrorMessage(mutation.error) : null,
  }
}

export function useUpdateBillingPlanProduct() {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: ({
      key,
      input,
    }: {
      key: string
      input: UpdateBillingPlanProductInput
    }) =>
      apiRequest<BillingPlan>(`/admin/billing/plans/${key}/product`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    onSuccess: () => invalidatePlanQueries(queryClient),
  })

  return {
    updateProduct: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error ? billingErrorMessage(mutation.error) : null,
  }
}

export function useRotateBillingPlanPrice() {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: ({
      key,
      input,
    }: {
      key: string
      input: RotateBillingPlanPriceInput
    }) =>
      apiRequest<BillingPlan>(`/admin/billing/plans/${key}/price`, {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: queryKeys.adminBilling.all }),
  })

  return {
    rotatePrice: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error ? billingErrorMessage(mutation.error) : null,
  }
}
