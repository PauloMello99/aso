"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiRequest } from "@/infrastructure/api/client"
import { queryKeys } from "@/infrastructure/query/query-keys"
import type {
  BillingInterval,
  CheckoutSessionResponse,
  PortalSessionResponse,
  Subscription,
} from "../types"

export function useCreateCheckoutSession(orgId: string) {
  const mutation = useMutation({
    mutationFn: (interval?: BillingInterval) =>
      apiRequest<CheckoutSessionResponse>(
        `/orgs/${orgId}/subscription/checkout`,
        { method: "POST", body: JSON.stringify({ interval }) },
      ),
    onSuccess: (data) => {
      window.location.assign(data.url)
    },
  })

  return {
    createCheckoutSession: mutation.mutate,
    isPending: mutation.isPending,
    error: mutation.error instanceof Error ? mutation.error.message : null,
  }
}

export function useCreatePortalSession(orgId: string) {
  const mutation = useMutation({
    mutationFn: () =>
      apiRequest<PortalSessionResponse>(
        `/orgs/${orgId}/subscription/portal`,
        { method: "POST" },
      ),
    onSuccess: (data) => {
      window.location.assign(data.url)
    },
  })

  return {
    createPortalSession: mutation.mutate,
    isPending: mutation.isPending,
    error: mutation.error instanceof Error ? mutation.error.message : null,
  }
}

export function useScheduleSubscriptionCancellation(orgId: string) {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: () =>
      apiRequest<Subscription>(
        `/orgs/${orgId}/subscription/schedule-cancellation`,
        { method: "POST" },
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.billing.subscription(orgId),
      })
    },
  })

  return {
    scheduleCancellation: mutation.mutate,
    isPending: mutation.isPending,
    error: mutation.error instanceof Error ? mutation.error.message : null,
  }
}

export function useResumeSubscription(orgId: string) {
  const queryClient = useQueryClient()
  const mutation = useMutation({
    mutationFn: () =>
      apiRequest<Subscription>(`/orgs/${orgId}/subscription/resume`, {
        method: "POST",
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.billing.subscription(orgId),
      })
    },
  })

  return {
    resumeSubscription: mutation.mutate,
    isPending: mutation.isPending,
    error: mutation.error instanceof Error ? mutation.error.message : null,
  }
}
