"use client"

import { useMutation } from "@tanstack/react-query"
import { apiRequest } from "@/infrastructure/api/client"
import type { CheckoutSessionResponse, PortalSessionResponse } from "../types"

export function useCreateCheckoutSession(orgId: string) {
  const mutation = useMutation({
    mutationFn: () =>
      apiRequest<CheckoutSessionResponse>(
        `/orgs/${orgId}/subscription/checkout`,
        { method: "POST" },
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
