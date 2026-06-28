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
      // Insere já no cache para que o novo tipo apareça no seletor de imediato
      // (permite auto-selecioná-lo após criar pela modal, sem esperar refetch).
      queryClient.setQueryData<ServiceType[]>(
        queryKeys.services.types(orgId),
        (old) => (old ? [...old, created] : [created]),
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
  }
}
