"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiRequest } from "@/infrastructure/api/client"
import { queryKeys } from "@/infrastructure/query/query-keys"
import type { Customer, CustomersFilter, Gender } from "../types"

export function useCustomers(orgId: string, filter?: CustomersFilter) {
  const queryClient = useQueryClient()

  // ── Query ──────────────────────────────────────────────────────────────────

  const { data = [], isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.customers.list(orgId, filter),
    queryFn: () => {
      const params = new URLSearchParams()
      if (filter?.search) params.set("search", filter.search)
      if (filter?.enabledOnly) params.set("enabled", "true")
      if (filter?.status) params.set("status", filter.status)
      if (filter?.originId) params.set("originId", filter.originId)
      if (filter?.gender) params.set("gender", filter.gender)
      if (filter?.from) params.set("from", filter.from)
      if (filter?.to) params.set("to", filter.to)
      if (filter?.birthMonth) params.set("birthMonth", String(filter.birthMonth))
      if (filter?.city) params.set("city", filter.city)
      if (filter?.state) params.set("state", filter.state)
      const query = params.toString() ? `?${params.toString()}` : ""
      return apiRequest<Customer[]>(`/orgs/${orgId}/customers${query}`)
    },
    enabled: !!orgId,
  })

  // ── Mutations ──────────────────────────────────────────────────────────────

  type CreateBody = {
    name: string
    email?: string | null
    phone?: string | null
    gender?: Gender | null
    birthDate?: string | null
    address?: string | null
    number?: string
    city?: string | null
    notes?: string | null
  }

  type UpdateBody = Partial<CreateBody> & { enabled?: boolean }

  const createCustomerMutation = useMutation({
    mutationFn: (body: CreateBody) =>
      apiRequest<Customer>(`/orgs/${orgId}/customers`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.customers.all(orgId) })
    },
  })

  const updateCustomerMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateBody }) =>
      apiRequest<Customer>(`/orgs/${orgId}/customers/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.customers.all(orgId) })
    },
  })

  const deleteCustomerMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest<void>(`/orgs/${orgId}/customers/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.customers.all(orgId) })
    },
  })

  // ── Stable wrappers ─────────────────────────────────────────────────────────

  async function createCustomer(body: CreateBody): Promise<Customer> {
    return createCustomerMutation.mutateAsync(body)
  }

  async function updateCustomer(id: string, body: UpdateBody): Promise<Customer> {
    return updateCustomerMutation.mutateAsync({ id, body })
  }

  async function deleteCustomer(id: string): Promise<void> {
    return deleteCustomerMutation.mutateAsync(id)
  }

  return {
    customers: data,
    loading: isLoading,
    error: error instanceof Error ? error.message : null,
    refetch,
    createCustomer,
    updateCustomer,
    deleteCustomer,
  }
}
