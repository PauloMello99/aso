"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiRequest } from "@/infrastructure/api/client"
import { queryKeys } from "@/infrastructure/query/query-keys"
import { campaignListErrorMessage } from "../lib/error-messages"
import type {
  Campaign,
  CreateCampaignInput,
  ListCampaignsResponse,
  UpdateCampaignInput,
} from "../schemas/campaign.schema"
import type { CampaignTrigger } from "../types"

const EMPTY_CAMPAIGNS: Campaign[] = []
const EMPTY_TRIGGERS: CampaignTrigger[] = []

export function useCampaigns(orgId: string) {
  const queryClient = useQueryClient()
  const key = queryKeys.campaigns.list(orgId)

  const { data, isLoading, error } = useQuery({
    queryKey: key,
    queryFn: () =>
      apiRequest<ListCampaignsResponse>(`/orgs/${orgId}/campaigns`),
    enabled: !!orgId,
  })

  const invalidate = () => {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.campaigns.all(orgId),
    })
  }

  const createMutation = useMutation({
    mutationFn: (input: CreateCampaignInput) =>
      apiRequest<Campaign>(`/orgs/${orgId}/campaigns`, {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: invalidate,
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateCampaignInput }) =>
      apiRequest<Campaign>(`/orgs/${orgId}/campaigns/${id}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      }),
    onSuccess: invalidate,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest<void>(`/orgs/${orgId}/campaigns/${id}`, { method: "DELETE" }),
    onSuccess: invalidate,
  })

  return {
    campaigns: data?.campaigns ?? EMPTY_CAMPAIGNS,
    campaignsEnabled: data?.campaignsEnabled ?? false,
    availableTriggers: data?.availableTriggers ?? EMPTY_TRIGGERS,
    defaults: data?.defaults,
    loading: isLoading,
    error: error ? campaignListErrorMessage(error) : null,
    createCampaign: (input: CreateCampaignInput) =>
      createMutation.mutateAsync(input),
    updateCampaign: (id: string, patch: UpdateCampaignInput) =>
      updateMutation.mutateAsync({ id, patch }),
    deleteCampaign: (id: string) => deleteMutation.mutateAsync(id),
  }
}
