"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiRequest } from "@/infrastructure/api/client"
import { queryKeys } from "@/infrastructure/query/query-keys"
import type { NormalizedInvoice, Subscription } from "@/features/billing/types"

export function useAdminSubscription(orgId: string | undefined) {
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.adminSubscription.detail(orgId ?? ""),
    queryFn: () => apiRequest<Subscription>(`/admin/orgs/${orgId}/subscription`),
    enabled: !!orgId,
  })

  return {
    subscription: data ?? null,
    loading: isLoading,
    error: error instanceof Error ? error.message : null,
  }
}

export function useAdminSubscriptionInvoices(orgId: string | undefined) {
  const { data = [], isLoading, error } = useQuery({
    queryKey: queryKeys.adminSubscription.invoices(orgId ?? ""),
    queryFn: () =>
      apiRequest<NormalizedInvoice[]>(`/admin/orgs/${orgId}/subscription/invoices`),
    enabled: !!orgId,
  })

  return {
    invoices: data,
    loading: isLoading,
    error: error instanceof Error ? error.message : null,
  }
}

function invalidateSubscriptionQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  orgId: string,
) {
  void queryClient.invalidateQueries({
    queryKey: queryKeys.adminSubscription.detail(orgId),
  })
  void queryClient.invalidateQueries({
    queryKey: queryKeys.adminSubscription.invoices(orgId),
  })
  void queryClient.invalidateQueries({
    queryKey: queryKeys.billing.subscription(orgId),
  })
}

export function useGrantComp(orgId: string) {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: (input: { reason: string; expiresAt?: string }) =>
      apiRequest<Subscription>(`/admin/orgs/${orgId}/subscription/comp`, {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => invalidateSubscriptionQueries(queryClient, orgId),
  })

  return {
    grantComp: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error instanceof Error ? mutation.error.message : null,
  }
}

export function useRevokeComp(orgId: string) {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: () =>
      apiRequest<Subscription>(`/admin/orgs/${orgId}/subscription/comp`, {
        method: "DELETE",
      }),
    onSuccess: () => invalidateSubscriptionQueries(queryClient, orgId),
  })

  return {
    revokeComp: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error instanceof Error ? mutation.error.message : null,
  }
}

export function useApplyDiscount(orgId: string) {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: (input: { percentOff: number; durationMonths?: number }) =>
      apiRequest<Subscription>(`/admin/orgs/${orgId}/subscription/discount`, {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => invalidateSubscriptionQueries(queryClient, orgId),
  })

  return {
    applyDiscount: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error instanceof Error ? mutation.error.message : null,
  }
}

export function useRemoveDiscount(orgId: string) {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: () =>
      apiRequest<Subscription>(`/admin/orgs/${orgId}/subscription/discount`, {
        method: "DELETE",
      }),
    onSuccess: () => invalidateSubscriptionQueries(queryClient, orgId),
  })

  return {
    removeDiscount: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error instanceof Error ? mutation.error.message : null,
  }
}
