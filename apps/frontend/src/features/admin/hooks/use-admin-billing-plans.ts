"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiRequest } from "@/infrastructure/api/client"
import { queryKeys } from "@/infrastructure/query/query-keys"
import { billingErrorMessage } from "@/features/admin/lib/billing-error-messages"
import type {
  BillingPlan,
  BillingInterval,
  BillingPlanPrice,
  RotatePlanIntervalPriceInput,
  RotatePlanIntervalPriceResult,
  UpdateBillingPlanProductInput,
  UpsertPlanIntervalPriceInput,
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

export function useRotatePlanIntervalPrice() {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: ({
      key,
      interval,
      input,
    }: {
      key: string
      interval: BillingInterval
      input: RotatePlanIntervalPriceInput
    }) =>
      apiRequest<RotatePlanIntervalPriceResult>(
        `/admin/billing/plans/${key}/prices/${interval}`,
        {
          method: "POST",
          body: JSON.stringify(input),
        },
      ),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: queryKeys.adminBilling.all }),
  })

  return {
    rotatePrice: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error ? billingErrorMessage(mutation.error) : null,
  }
}

export function useCreatePlanIntervalPrice() {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: ({
      key,
      input,
    }: {
      key: string
      input: UpsertPlanIntervalPriceInput
    }) =>
      apiRequest<BillingPlanPrice>(`/admin/billing/plans/${key}/prices`, {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: queryKeys.adminBilling.all }),
  })

  return {
    createPrice: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error ? billingErrorMessage(mutation.error) : null,
  }
}

export function useSetPlanIntervalActive() {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: ({
      key,
      interval,
      active,
    }: {
      key: string
      interval: BillingInterval
      active: boolean
    }) =>
      apiRequest<BillingPlanPrice>(`/admin/billing/plans/${key}/prices/${interval}`, {
        method: "PATCH",
        body: JSON.stringify({ active }),
      }),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: queryKeys.adminBilling.all }),
  })

  return {
    setActive: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error ? billingErrorMessage(mutation.error) : null,
  }
}
