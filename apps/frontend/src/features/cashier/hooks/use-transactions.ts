"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiRequest } from "@/infrastructure/api/client"
import { queryKeys } from "@/infrastructure/query/query-keys"
import type {
  PaymentMethod,
  Transaction,
  TransactionType,
  TransactionView,
  TransactionsFilter,
} from "../types"

export interface CreateTransactionBody {
  description: string
  type: TransactionType
  grossCents: number
  paymentMethod: PaymentMethod
  categoryId?: string | null
  transactedAt?: string
}

export interface TransferBody {
  fromMethod: PaymentMethod
  toMethod: PaymentMethod
  amountCents: number
  description?: string
  transactedAt?: string
}

export interface CorrectionResult {
  reversal: Transaction
  replacement: Transaction
}

export function useTransactions(orgId: string, filter?: TransactionsFilter) {
  const queryClient = useQueryClient()

  const { data = [], isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.cashier.list(orgId, filter),
    queryFn: () => {
      const params = new URLSearchParams()
      if (filter?.from) params.set("from", filter.from)
      if (filter?.to) params.set("to", filter.to)
      if (filter?.type) params.set("type", filter.type)
      if (filter?.paymentMethod) params.set("paymentMethod", filter.paymentMethod)
      if (filter?.categoryId) params.set("categoryId", filter.categoryId)
      if (filter?.minCents !== undefined)
        params.set("minCents", String(filter.minCents))
      if (filter?.maxCents !== undefined)
        params.set("maxCents", String(filter.maxCents))
      if (filter?.createdBy) params.set("createdBy", filter.createdBy)
      if (filter?.q) params.set("q", filter.q)
      const query = params.toString() ? `?${params.toString()}` : ""
      return apiRequest<TransactionView[]>(
        `/orgs/${orgId}/cashier/transactions${query}`,
      )
    },
    enabled: !!orgId,
  })

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: queryKeys.cashier.all(orgId) })
  }

  const createMutation = useMutation({
    mutationFn: (body: CreateTransactionBody) =>
      apiRequest<Transaction>(`/orgs/${orgId}/cashier/transactions`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: invalidate,
  })

  const reverseMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest<Transaction>(
        `/orgs/${orgId}/cashier/transactions/${id}/reverse`,
        { method: "POST" },
      ),
    onSuccess: invalidate,
  })

  const correctMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: CreateTransactionBody }) =>
      apiRequest<CorrectionResult>(
        `/orgs/${orgId}/cashier/transactions/${id}/correct`,
        { method: "POST", body: JSON.stringify(body) },
      ),
    onSuccess: invalidate,
  })

  const transferMutation = useMutation({
    mutationFn: (body: TransferBody) =>
      apiRequest(`/orgs/${orgId}/cashier/transfers`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: invalidate,
  })

  return {
    transactions: data,
    loading: isLoading,
    error: error instanceof Error ? error.message : null,
    refetch,
    createTransaction: (body: CreateTransactionBody) =>
      createMutation.mutateAsync(body),
    reverseTransaction: (id: string) => reverseMutation.mutateAsync(id),
    correctTransaction: (id: string, body: CreateTransactionBody) =>
      correctMutation.mutateAsync({ id, body }),
    transfer: async (body: TransferBody): Promise<void> => {
      await transferMutation.mutateAsync(body)
    },
  }
}
