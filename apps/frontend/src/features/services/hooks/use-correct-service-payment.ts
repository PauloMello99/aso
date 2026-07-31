"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiRequest } from "@/infrastructure/api/client"
import { queryKeys } from "@/infrastructure/query/query-keys"
import type { Service, ServicePaymentMethod } from "../types"

export interface CorrectPaymentBody {
  grossCents: number
  paymentMethod: ServicePaymentMethod
  description?: string
  transactedAt?: string
}

export function useCorrectServicePayment(orgId: string) {
  const queryClient = useQueryClient()

  const correctPaymentMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: CorrectPaymentBody }) =>
      apiRequest<Service>(`/orgs/${orgId}/services/${id}/payment`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.services.all(orgId),
      })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.cashier.all(orgId),
      })
      void queryClient.invalidateQueries({
        queryKey: queryKeys.overview.detail(orgId),
      })
    },
  })

  return {
    correctPayment: (id: string, body: CorrectPaymentBody) =>
      correctPaymentMutation.mutateAsync({ id, body }),
  }
}
