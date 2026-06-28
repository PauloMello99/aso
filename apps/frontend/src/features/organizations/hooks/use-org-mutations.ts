"use client"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiRequest } from "@/infrastructure/api/client"
import { queryKeys } from "@/infrastructure/query/query-keys"
import type { OrgSummary } from "@/features/dashboard/hooks/use-orgs"
import type { CreateOrgFormValues, UpdateOrgFormValues } from "../schemas/org.schemas"

export function useOrgMutations(orgId?: string) {
  const queryClient = useQueryClient()

  const createOrgMutation = useMutation({
    mutationFn: (values: CreateOrgFormValues) =>
      apiRequest<OrgSummary>("/orgs", {
        method: "POST",
        body: JSON.stringify(values),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.orgs.list() })
    },
  })

  const updateOrgMutation = useMutation({
    mutationFn: (values: UpdateOrgFormValues) => {
      if (!orgId) throw new Error("orgId is required for update")
      return apiRequest<OrgSummary>(`/orgs/${orgId}`, {
        method: "PATCH",
        body: JSON.stringify(values),
      })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.orgs.list() })
      if (orgId) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.orgs.detail(orgId) })
      }
    },
  })

  const deleteOrgMutation = useMutation({
    mutationFn: () => {
      if (!orgId) throw new Error("orgId is required for delete")
      return apiRequest<void>(`/orgs/${orgId}`, { method: "DELETE" })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.orgs.all })
    },
  })

  const transferOwnershipMutation = useMutation({
    mutationFn: (memberId: string) => {
      if (!orgId) throw new Error("orgId is required for transfer")
      return apiRequest<void>(`/orgs/${orgId}/transfer-ownership`, {
        method: "POST",
        body: JSON.stringify({ memberId }),
      })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.orgs.all })
      if (orgId) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.members.list(orgId) })
      }
    },
  })

  return {
    createOrg: createOrgMutation.mutateAsync,
    updateOrg: updateOrgMutation.mutateAsync,
    deleteOrg: deleteOrgMutation.mutateAsync,
    transferOwnership: transferOwnershipMutation.mutateAsync,
    isCreating: createOrgMutation.isPending,
    isUpdating: updateOrgMutation.isPending,
    isDeleting: deleteOrgMutation.isPending,
    isTransferring: transferOwnershipMutation.isPending,
  }
}
