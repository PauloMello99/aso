"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiRequest } from "@/infrastructure/api/client"
import { queryKeys } from "@/infrastructure/query/query-keys"
import type { AdminOrg, AdminUser, PlatformRole, PlatformStats } from "../types"

export function useAdminStats() {
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.admin.stats(),
    queryFn: () => apiRequest<PlatformStats>("/admin/stats"),
  })
  return {
    stats: data ?? null,
    loading: isLoading,
    error: error instanceof Error ? error.message : null,
  }
}

export function useAdminOrgs() {
  const queryClient = useQueryClient()

  const { data = [], isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.admin.orgs(),
    queryFn: () => apiRequest<AdminOrg[]>("/admin/orgs"),
  })

  const suspendMutation = useMutation({
    mutationFn: ({ id, suspended }: { id: string; suspended: boolean }) =>
      apiRequest<void>(`/admin/orgs/${id}/suspend`, {
        method: "PATCH",
        body: JSON.stringify({ suspended }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.all })
    },
  })

  return {
    orgs: data,
    loading: isLoading,
    error: error instanceof Error ? error.message : null,
    refetch,
    setSuspended: (id: string, suspended: boolean) =>
      suspendMutation.mutateAsync({ id, suspended }),
  }
}

export function useAdminUsers() {
  const queryClient = useQueryClient()

  const { data = [], isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.admin.users(),
    queryFn: () => apiRequest<AdminUser[]>("/admin/users"),
  })

  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: PlatformRole }) =>
      apiRequest<void>(`/admin/users/${id}/platform-role`, {
        method: "PATCH",
        body: JSON.stringify({ role }),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.all })
    },
  })

  return {
    users: data,
    loading: isLoading,
    error: error instanceof Error ? error.message : null,
    refetch,
    setPlatformRole: (id: string, role: PlatformRole) =>
      roleMutation.mutateAsync({ id, role }),
  }
}
