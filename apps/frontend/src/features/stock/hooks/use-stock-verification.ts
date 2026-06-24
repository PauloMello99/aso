"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiRequest } from "@/infrastructure/api/client"

export interface StockSettings {
  intervalDays: number | null
  lastVerificationAt: string | null
}

export interface VerificationSummary {
  id: string
  performedBy: string | null
  note: string | null
  createdAt: string
  itemCount: number
  discrepancyCount: number
}

export interface VerificationItemInput {
  materialId: string
  physicalQuantity: string
}

export function useStockVerification(orgId: string) {
  const queryClient = useQueryClient()
  const settingsKey = ["stock-settings", orgId] as const
  const listKey = ["stock-verifications", orgId] as const

  const settingsQuery = useQuery({
    queryKey: settingsKey,
    queryFn: () =>
      apiRequest<StockSettings>(`/orgs/${orgId}/materials/stock-settings`),
    enabled: !!orgId,
  })

  const verificationsQuery = useQuery({
    queryKey: listKey,
    queryFn: () =>
      apiRequest<VerificationSummary[]>(`/orgs/${orgId}/materials/verifications`),
    enabled: !!orgId,
  })

  const setIntervalMutation = useMutation({
    mutationFn: (intervalDays: number | null) =>
      apiRequest<StockSettings>(`/orgs/${orgId}/materials/stock-settings`, {
        method: "PUT",
        body: JSON.stringify({ intervalDays }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: settingsKey })
    },
  })

  const createMutation = useMutation({
    mutationFn: (body: {
      note?: string
      reconcile: boolean
      items: VerificationItemInput[]
    }) =>
      apiRequest(`/orgs/${orgId}/materials/verifications`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: listKey })
      void queryClient.invalidateQueries({ queryKey: settingsKey })
      void queryClient.invalidateQueries({ queryKey: ["materials", orgId] })
    },
  })

  return {
    settings: settingsQuery.data ?? { intervalDays: null, lastVerificationAt: null },
    verifications: verificationsQuery.data ?? [],
    loading: settingsQuery.isLoading,
    setInterval: (days: number | null) => setIntervalMutation.mutateAsync(days),
    createVerification: (body: {
      note?: string
      reconcile: boolean
      items: VerificationItemInput[]
    }) => createMutation.mutateAsync(body),
  }
}
