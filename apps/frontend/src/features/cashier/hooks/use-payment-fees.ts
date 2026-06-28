"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiRequest } from "@/infrastructure/api/client"
import { queryKeys } from "@/infrastructure/query/query-keys"
import type { PaymentFee, PaymentMethod } from "../types"

export interface UpsertFeeItem {
  paymentMethod: PaymentMethod
  percent: string
  fixedCents: number
}

// Referência estável p/ o estado "sem dados" — evita novo array a cada render,
// que dispararia loops em efeitos que dependem de `fees` (ex.: PaymentFeesForm).
const EMPTY_FEES: PaymentFee[] = []

export function usePaymentFees(orgId: string) {
  const queryClient = useQueryClient()

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.cashier.fees(orgId),
    queryFn: () => apiRequest<PaymentFee[]>(`/orgs/${orgId}/cashier/fees`),
    enabled: !!orgId,
  })

  const upsertMutation = useMutation({
    mutationFn: (fees: UpsertFeeItem[]) =>
      apiRequest<PaymentFee[]>(`/orgs/${orgId}/cashier/fees`, {
        method: "PUT",
        body: JSON.stringify({ fees }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.cashier.all(orgId) })
    },
  })

  return {
    fees: data ?? EMPTY_FEES,
    loading: isLoading,
    error: error instanceof Error ? error.message : null,
    upsertFees: (fees: UpsertFeeItem[]) => upsertMutation.mutateAsync(fees),
  }
}
