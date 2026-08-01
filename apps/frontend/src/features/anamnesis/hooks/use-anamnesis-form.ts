"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiRequest } from "@/infrastructure/api/client"
import { queryKeys } from "@/infrastructure/query/query-keys"
import type { AnamnesisFormVersion, AnamnesisQuestion } from "../types"

const EMPTY: AnamnesisFormVersion[] = []

interface SaveAnamnesisFormBody {
  questions: AnamnesisQuestion[]
}

export function useAnamnesisForm(orgId: string, serviceTypeId: string) {
  const queryClient = useQueryClient()
  const enabled = !!orgId && !!serviceTypeId
  const formKey = queryKeys.anamnesis.form(orgId, serviceTypeId)
  const versionsKey = queryKeys.anamnesis.versions(orgId, serviceTypeId)

  const currentQuery = useQuery({
    queryKey: formKey,
    queryFn: async () =>
      (await apiRequest<AnamnesisFormVersion | null>(
        `/orgs/${orgId}/service-types/${serviceTypeId}/anamnesis-form`,
      )) ?? null,
    enabled,
  })

  const versionsQuery = useQuery({
    queryKey: versionsKey,
    queryFn: () =>
      apiRequest<AnamnesisFormVersion[]>(
        `/orgs/${orgId}/service-types/${serviceTypeId}/anamnesis-form/versions`,
      ),
    enabled,
  })

  const saveMutation = useMutation({
    mutationFn: (body: SaveAnamnesisFormBody) =>
      apiRequest<AnamnesisFormVersion>(
        `/orgs/${orgId}/service-types/${serviceTypeId}/anamnesis-form/versions`,
        {
          method: "POST",
          body: JSON.stringify(body),
        },
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: formKey })
      void queryClient.invalidateQueries({ queryKey: versionsKey })
    },
  })

  return {
    currentVersion: currentQuery.data ?? null,
    loading: currentQuery.isLoading,
    loadError: currentQuery.error instanceof Error ? currentQuery.error.message : null,
    versions: versionsQuery.data ?? EMPTY,
    versionsLoading: versionsQuery.isLoading,
    saveForm: (questions: AnamnesisQuestion[]) =>
      saveMutation.mutateAsync({ questions }),
    saving: saveMutation.isPending,
  }
}
