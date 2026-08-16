"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiRequest } from "@/infrastructure/api/client"
import { queryKeys } from "@/infrastructure/query/query-keys"
import { billingErrorMessage } from "@/features/admin/lib/billing-error-messages"
import type { BillingCoupon, CreateBillingCouponInput } from "@/features/billing/types"

export function useAdminBillingCoupons(active?: boolean) {
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.adminBilling.coupons(active),
    queryFn: () =>
      apiRequest<BillingCoupon[]>(
        active !== undefined
          ? `/admin/billing/coupons?active=${active}`
          : "/admin/billing/coupons",
      ),
  })

  return {
    coupons: data ?? [],
    loading: isLoading,
    error: error ? billingErrorMessage(error) : null,
  }
}

function invalidateCouponQueries(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: queryKeys.adminBilling.all })
}

export function useCreateBillingCoupon() {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: (input: CreateBillingCouponInput) =>
      apiRequest<BillingCoupon>("/admin/billing/coupons", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => invalidateCouponQueries(queryClient),
  })

  return {
    createCoupon: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error ? billingErrorMessage(mutation.error) : null,
  }
}

export function useToggleBillingCoupon() {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) =>
      apiRequest<BillingCoupon>(`/admin/billing/coupons/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ active }),
      }),
    onSuccess: () => invalidateCouponQueries(queryClient),
  })

  return {
    toggleCoupon: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error ? billingErrorMessage(mutation.error) : null,
  }
}
