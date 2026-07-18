"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiRequest } from "@/infrastructure/api/client"
import { queryKeys } from "@/infrastructure/query/query-keys"
import type { ServiceType } from "../types"

const EMPTY: ServiceType[] = []

export function useServiceTypes(orgId: string) {
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.services.types(orgId),
    queryFn: () => apiRequest<ServiceType[]>(`/orgs/${orgId}/services/types`),
    enabled: !!orgId,
  })

  const createMutation = useMutation({
    mutationFn: (name: string) =>
      apiRequest<ServiceType>(`/orgs/${orgId}/services/types`, {
        method: "POST",
        body: JSON.stringify({ name }),
      }),
    onSuccess: (created) => {
      queryClient.setQueryData<ServiceType[]>(
        queryKeys.services.types(orgId),
        (old) => (old ? [...old, created] : [created]),
      )
      void queryClient.invalidateQueries({
        queryKey: queryKeys.services.types(orgId),
      })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string
      data: { name?: string; description?: string | null }
    }) =>
      apiRequest<ServiceType>(`/orgs/${orgId}/services/types/${id}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData<ServiceType[]>(
        queryKeys.services.types(orgId),
        (old) =>
          old
            ? old.map((type) => (type.id === updated.id ? updated : type))
            : [updated],
      )
      void queryClient.invalidateQueries({
        queryKey: queryKeys.services.types(orgId),
      })
    },
  })

  return {
    serviceTypes: data ?? EMPTY,
    loading: isLoading,
    createServiceType: (name: string) => createMutation.mutateAsync(name),
    updateServiceType: (
      id: string,
      data: { name?: string; description?: string | null },
    ) => updateMutation.mutateAsync({ id, data }),
  }
}
