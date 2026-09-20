"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiRequest, ApiError } from "@/infrastructure/api/client"
import { queryKeys } from "@/infrastructure/query/query-keys"
import type { MemberPayment, MemberPaymentSummary, MemberPaymentView } from "../types"
import type { MemberPaymentBody } from "../schemas/member-payment.schemas"

const EMPTY_PAYMENTS: MemberPaymentView[] = []

export interface CorrectMemberPaymentResult {
  reversal: MemberPayment
  replacement: MemberPayment
}

// Leitura (passo 11) + mutations (passo 12, botão "Pagar" e ações de
// estorno/correção da lista) do Bloco 2.
export function useMemberPayments(
  orgId: string,
  userId: string | undefined,
  enabled = true,
  // Resumo segue bloqueado para membro desabilitado (só o histórico foi
  // liberado no backend) — por padrão acompanha `enabled`.
  summaryEnabled = enabled,
) {
  const queryClient = useQueryClient()

  const paymentsQuery = useQuery({
    queryKey: queryKeys.members.payments(orgId, userId ?? ""),
    queryFn: () =>
      apiRequest<MemberPaymentView[]>(
        `/orgs/${orgId}/members/${userId}/payments`,
      ),
    enabled: !!orgId && !!userId && enabled,
  })

  const summaryQuery = useQuery({
    queryKey: queryKeys.members.summary(orgId, userId ?? ""),
    queryFn: () =>
      apiRequest<MemberPaymentSummary>(
        `/orgs/${orgId}/members/${userId}/payment-summary`,
      ),
    enabled: !!orgId && !!userId && summaryEnabled,
  })

  // Um pagamento a membro também lança uma transação de caixa (dupla
  // escrita no backend, ver create-member-payment.use-case.ts) — invalida os
  // três domínios afetados. `cashier.all(orgId)` é prefixo de list/balance/
  // history/fees/categories/commissions/memberFees (invalidateQueries por
  // prefixo, não exact match).
  function invalidate() {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.members.payments(orgId, userId ?? ""),
    })
    void queryClient.invalidateQueries({
      queryKey: queryKeys.members.summary(orgId, userId ?? ""),
    })
    void queryClient.invalidateQueries({
      queryKey: queryKeys.cashier.all(orgId),
    })
  }

  const createMutation = useMutation({
    mutationFn: (body: MemberPaymentBody) =>
      apiRequest<MemberPayment>(`/orgs/${orgId}/members/${userId}/payments`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: invalidate,
  })

  const reverseMutation = useMutation({
    mutationFn: (paymentId: string) =>
      apiRequest<MemberPayment>(
        `/orgs/${orgId}/members/${userId}/payments/${paymentId}/reverse`,
        { method: "POST" },
      ),
    onSuccess: invalidate,
  })

  const correctMutation = useMutation({
    mutationFn: ({
      paymentId,
      body,
    }: {
      paymentId: string
      body: MemberPaymentBody
    }) =>
      apiRequest<CorrectMemberPaymentResult>(
        `/orgs/${orgId}/members/${userId}/payments/${paymentId}/correct`,
        { method: "POST", body: JSON.stringify(body) },
      ),
    onSuccess: invalidate,
  })

  return {
    payments: paymentsQuery.data ?? EMPTY_PAYMENTS,
    paymentsLoading: paymentsQuery.isLoading,
    // Expõe o ApiError inteiro (não só `.message`, diferente dos hooks
    // irmãos) — a tela precisa do `.status` para distinguir 403 (outro
    // membro) de 404 (uuid que não é membro) e tratar os dois como "acesso
    // negado", nunca tela branca.
    paymentsError:
      paymentsQuery.error instanceof ApiError ? paymentsQuery.error : null,
    summary: summaryQuery.data ?? null,
    summaryLoading: summaryQuery.isLoading,
    summaryError:
      summaryQuery.error instanceof ApiError ? summaryQuery.error : null,
    createPayment: (body: MemberPaymentBody) => createMutation.mutateAsync(body),
    reversePayment: (paymentId: string) =>
      reverseMutation.mutateAsync(paymentId),
    correctPayment: (paymentId: string, body: MemberPaymentBody) =>
      correctMutation.mutateAsync({ paymentId, body }),
  }
}
