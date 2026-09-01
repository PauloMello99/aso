"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiRequest } from "@/infrastructure/api/client"
import { queryKeys } from "@/infrastructure/query/query-keys"
import type { CampaignSettings } from "../types"
import type { CampaignSettingsFormValues } from "../schemas/campaign-settings.schema"

export function useCampaignSettings(orgId: string) {
  const { data, isLoading, error, isFetching, refetch } = useQuery({
    queryKey: queryKeys.campaigns.settings(orgId),
    queryFn: () =>
      apiRequest<CampaignSettings>(`/orgs/${orgId}/campaign-settings`),
    enabled: !!orgId,
    retry: false,
  })

  return {
    settings: data ?? null,
    loading: isLoading,
    isFetching,
    error: error instanceof Error ? error.message : null,
    refetch,
  }
}

export function useUpdateCampaignSettings(orgId: string) {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    // O PUT é replace total: o body carrega os 3 gatilhos e os 6 textos.
    mutationFn: (values: CampaignSettingsFormValues) =>
      apiRequest<CampaignSettings>(`/orgs/${orgId}/campaign-settings`, {
        method: "PUT",
        body: JSON.stringify(values),
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.campaigns.settings(orgId), data)
      void queryClient.invalidateQueries({
        queryKey: queryKeys.campaigns.settings(orgId),
      })
    },
  })

  return {
    updateSettings: mutation.mutateAsync,
    isPending: mutation.isPending,
    error: mutation.error instanceof Error ? mutation.error.message : null,
  }
}
