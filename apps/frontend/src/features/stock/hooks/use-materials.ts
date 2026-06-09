"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiRequest } from "@/infrastructure/api/client"
import { queryKeys } from "@/infrastructure/query/query-keys"
import type { Material, MaterialsFilter } from "../types"

export function useMaterials(orgId: string, filter?: MaterialsFilter) {
  const queryClient = useQueryClient()

  // ── Query ──────────────────────────────────────────────────────────────────

  const { data = [], isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.materials.list(orgId, filter),
    queryFn: () => {
      const params = new URLSearchParams()
      if (filter?.categoryId) params.set("categoryId", filter.categoryId)
      if (filter?.lowStockOnly) params.set("lowStock", "true")
      const query = params.toString() ? `?${params.toString()}` : ""
      return apiRequest<Material[]>(`/orgs/${orgId}/materials${query}`)
    },
    enabled: !!orgId,
  })

  // ── Mutations ──────────────────────────────────────────────────────────────

  type CreateBody = {
    name: string
    unit?: string | null
    minimumQuantity?: string
    costPerUnit?: string | null
  }

  type UpdateBody = Partial<CreateBody>

  const createMaterialMutation = useMutation({
    mutationFn: (body: CreateBody) =>
      apiRequest<Material>(`/orgs/${orgId}/materials`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.materials.all(orgId) })
    },
  })

  const updateMaterialMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateBody }) =>
      apiRequest<Material>(`/orgs/${orgId}/materials/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.materials.all(orgId) })
    },
  })

  const deleteMaterialMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest<void>(`/orgs/${orgId}/materials/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.materials.all(orgId) })
    },
  })

  const restockMaterialMutation = useMutation({
    mutationFn: ({
      id,
      quantity,
      note,
    }: {
      id: string
      quantity: string
      note?: string | null
    }) =>
      apiRequest<Material>(`/orgs/${orgId}/materials/${id}/restock`, {
        method: "POST",
        body: JSON.stringify({ quantity, note: note ?? null }),
      }),
    onSuccess: (_, { id }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.materials.all(orgId) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.materials.movements(orgId, id) })
    },
  })

  const adjustStockMutation = useMutation({
    mutationFn: ({
      id,
      quantityDelta,
      note,
    }: {
      id: string
      quantityDelta: string
      note?: string | null
    }) =>
      apiRequest<Material>(`/orgs/${orgId}/materials/${id}/adjust`, {
        method: "POST",
        body: JSON.stringify({ quantityDelta, note: note ?? null }),
      }),
    onSuccess: (_, { id }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.materials.all(orgId) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.materials.movements(orgId, id) })
    },
  })

  // ── Stable wrappers (unchanged call signature for consumers) ───────────────

  async function createMaterial(body: CreateBody): Promise<Material> {
    return createMaterialMutation.mutateAsync(body)
  }

  async function updateMaterial(id: string, body: UpdateBody): Promise<Material> {
    return updateMaterialMutation.mutateAsync({ id, body })
  }

  async function deleteMaterial(id: string): Promise<void> {
    return deleteMaterialMutation.mutateAsync(id)
  }

  async function restockMaterial(
    id: string,
    quantity: string,
    note?: string | null,
  ): Promise<Material> {
    return restockMaterialMutation.mutateAsync({ id, quantity, note })
  }

  async function adjustStock(
    id: string,
    quantityDelta: string,
    note?: string | null,
  ): Promise<Material> {
    return adjustStockMutation.mutateAsync({ id, quantityDelta, note })
  }

  return {
    materials: data,
    loading: isLoading,
    error: error instanceof Error ? error.message : null,
    refetch,
    createMaterial,
    updateMaterial,
    deleteMaterial,
    restockMaterial,
    adjustStock,
  }
}

/** Derive low-stock status client-side */
export function isLowStock(material: Material): boolean {
  const minQty = parseFloat(material.minimumQuantity)
  const currentQty = parseFloat(material.stockQuantity)
  return minQty > 0 && currentQty <= minQty
}
