"use client"

import { useQuery } from "@tanstack/react-query"
import { apiRequest } from "@/infrastructure/api/client"
import { queryKeys } from "@/infrastructure/query/query-keys"
import type {
  AnamnesisResponseDetail,
  AnamnesisResponseListItem,
  AnamnesisResponsesFilter,
} from "../types"

const EMPTY: AnamnesisResponseListItem[] = []

function buildResponsesQuery(filters?: AnamnesisResponsesFilter): string {
  const params = new URLSearchParams()
  if (filters?.customerId) params.set("customerId", filters.customerId)
  if (filters?.serviceTypeId) params.set("serviceTypeId", filters.serviceTypeId)
  if (filters?.status) params.set("status", filters.status)
  const query = params.toString()
  return query ? `?${query}` : ""
}

export function useAnamnesisResponses(
  orgId: string,
  filters?: AnamnesisResponsesFilter,
) {
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.anamnesis.responses(orgId, filters),
    queryFn: () =>
      apiRequest<AnamnesisResponseListItem[]>(
        `/orgs/${orgId}/anamnesis-responses${buildResponsesQuery(filters)}`,
      ),
    enabled: !!orgId,
  })

  return {
    responses: data ?? EMPTY,
    loading: isLoading,
    error: error instanceof Error ? error.message : null,
  }
}

export function useAnamnesisResponse(orgId: string, id: string | undefined) {
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.anamnesis.response(orgId, id ?? ""),
    queryFn: () =>
      apiRequest<AnamnesisResponseDetail>(
        `/orgs/${orgId}/anamnesis-responses/${id}`,
      ),
    enabled: !!orgId && !!id,
  })

  return {
    response: data ?? null,
    loading: isLoading,
    error: error instanceof Error ? error.message : null,
  }
}
