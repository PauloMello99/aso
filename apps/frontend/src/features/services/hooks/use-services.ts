"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiRequest } from "@/infrastructure/api/client"
import { queryKeys } from "@/infrastructure/query/query-keys"
import type { Service, ServicePaymentMethod, ServicesFilter } from "../types"
import { useCorrectServicePayment } from "./use-correct-service-payment"

export interface ServiceMaterialBody {
  materialId: string
  quantity?: number
  finished?: boolean
}

export interface CreateServiceBody {
  customerId: string
  serviceTypeId?: string | null
  performedBy?: string | null
  description?: string | null
  amountCents: number
  paymentMethod: ServicePaymentMethod
  paymentStatus: "paid" | "pending"
  performedAt?: string
  materials: ServiceMaterialBody[]
}

export interface UpdateServiceBody {
  customerId?: string | null
  serviceTypeId?: string | null
  performedBy?: string | null
  description?: string | null
  performedAt?: string
}

export function useServices(orgId: string, filter?: ServicesFilter) {
  const queryClient = useQueryClient()

  const { data = [], isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.services.list(orgId, filter),
    queryFn: () => {
      const params = new URLSearchParams()
      if (filter?.from) params.set("from", filter.from)
      if (filter?.to) params.set("to", filter.to)
      if (filter?.serviceTypeId) params.set("serviceTypeId", filter.serviceTypeId)
      if (filter?.customerId) params.set("customerId", filter.customerId)
      if (filter?.performedBy) params.set("performedBy", filter.performedBy)
      if (filter?.status) params.set("status", filter.status)
      if (filter?.paymentMethod)
        params.set("paymentMethod", filter.paymentMethod)
      if (filter?.minCents !== undefined)
        params.set("minCents", String(filter.minCents))
      if (filter?.maxCents !== undefined)
        params.set("maxCents", String(filter.maxCents))
      if (filter?.q) params.set("q", filter.q)
      const query = params.toString() ? `?${params.toString()}` : ""
      return apiRequest<Service[]>(`/orgs/${orgId}/services${query}`)
    },
    enabled: !!orgId,
  })

  function invalidate() {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.services.all(orgId),
    })
  }

  const createMutation = useMutation({
    mutationFn: (body: CreateServiceBody) =>
      apiRequest<Service>(`/orgs/${orgId}/services`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: invalidate,
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateServiceBody }) =>
      apiRequest<Service>(`/orgs/${orgId}/services/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: invalidate,
  })

  const cancelMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest<Service>(`/orgs/${orgId}/services/${id}/cancel`, {
        method: "POST",
      }),
    onSuccess: invalidate,
  })

  const payMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest<Service>(`/orgs/${orgId}/services/${id}/pay`, {
        method: "POST",
      }),
    onSuccess: invalidate,
  })

  const { correctPayment } = useCorrectServicePayment(orgId)

  return {
    services: data,
    loading: isLoading,
    error: error instanceof Error ? error.message : null,
    refetch,
    createService: (body: CreateServiceBody) => createMutation.mutateAsync(body),
    updateService: (id: string, body: UpdateServiceBody) =>
      updateMutation.mutateAsync({ id, body }),
    cancelService: (id: string) => cancelMutation.mutateAsync(id),
    payService: (id: string) => payMutation.mutateAsync(id),
    correctPayment,
  }
}
