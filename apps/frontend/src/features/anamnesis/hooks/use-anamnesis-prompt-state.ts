"use client"

import { useQuery } from "@tanstack/react-query"
import { apiRequest } from "@/infrastructure/api/client"
import { queryKeys } from "@/infrastructure/query/query-keys"
import { resolveAnamnesisPrompt } from "@/features/services/lib/anamnesis-prompt"
import type { AnamnesisFormVersion, AnamnesisResponseListItem } from "../types"

interface LinkableAnamnesisResponse {
  id: string
  customerId: string | null
  serviceTypeId: string | null
  formVersionId: string | null
  submittedAt: string | null
  createdAt: string
}

export function useAnamnesisPromptState(
  orgId: string,
  customerId: string | undefined,
  serviceTypeId: string | undefined,
) {
  const hasIds = !!customerId && !!serviceTypeId
  const formEnabled = !!orgId && !!serviceTypeId

  const formQuery = useQuery({
    queryKey: queryKeys.anamnesis.form(orgId, serviceTypeId ?? ""),
    queryFn: async () =>
      (await apiRequest<AnamnesisFormVersion | null>(
        `/orgs/${orgId}/service-types/${serviceTypeId}/anamnesis-form`,
      )) ?? null,
    enabled: formEnabled,
  })

  const hasCurrentForm = !!formQuery.data

  const linkableEnabled = hasIds && formQuery.isSuccess && hasCurrentForm
  const linkableQuery = useQuery({
    queryKey: queryKeys.anamnesis.linkable(
      orgId,
      customerId ?? "",
      serviceTypeId ?? "",
    ),
    queryFn: () => {
      const params = new URLSearchParams({
        customerId: customerId ?? "",
        serviceTypeId: serviceTypeId ?? "",
      })
      return apiRequest<LinkableAnamnesisResponse[]>(
        `/orgs/${orgId}/anamnesis-responses/linkable?${params.toString()}`,
      )
    },
    enabled: linkableEnabled,
  })

  const linkableCount = linkableQuery.data?.length ?? 0
  const linkableResponseId = linkableQuery.data?.[0]?.id ?? null
  const linkableResolvedEmpty = linkableQuery.isSuccess && linkableCount === 0

  const submittedEnabled = linkableEnabled && linkableResolvedEmpty
  const submittedQuery = useQuery({
    queryKey: queryKeys.anamnesis.responses(orgId, {
      customerId,
      serviceTypeId,
      status: "submitted",
    }),
    queryFn: () => {
      const params = new URLSearchParams({
        customerId: customerId ?? "",
        serviceTypeId: serviceTypeId ?? "",
        status: "submitted",
      })
      return apiRequest<AnamnesisResponseListItem[]>(
        `/orgs/${orgId}/anamnesis-responses?${params.toString()}`,
      )
    },
    enabled: submittedEnabled,
  })

  const prompt = hasIds
    ? resolveAnamnesisPrompt({
        hasCurrentForm,
        linkableCount,
        submittedCount: submittedQuery.data?.length ?? 0,
      })
    : "hidden"

  const loading =
    formQuery.isLoading || (linkableEnabled && linkableQuery.isLoading)

  return { prompt, loading, linkableResponseId }
}
