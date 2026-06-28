"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiRequest } from "@/infrastructure/api/client"
import { queryKeys } from "@/infrastructure/query/query-keys"
import type { Me } from "../types"

export interface UpdateMeBody {
  name?: string
  email?: string
  avatarUrl?: string | null
}

export function useMe() {
  const queryClient = useQueryClient()

  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.me,
    queryFn: () => apiRequest<Me>("/auth/me"),
  })

  const updateMutation = useMutation({
    mutationFn: (body: UpdateMeBody) =>
      apiRequest<Me>("/auth/me", {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.me, updated)
    },
  })

  const uploadAvatarMutation = useMutation({
    mutationFn: (file: File) => {
      const form = new FormData()
      form.append("file", file)
      return apiRequest<Me>("/auth/me/avatar", { method: "POST", body: form })
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.me, updated)
    },
  })

  return {
    me: data ?? null,
    loading: isLoading,
    error: error instanceof Error ? error.message : null,
    updateMe: (body: UpdateMeBody) => updateMutation.mutateAsync(body),
    uploadAvatar: (file: File) => uploadAvatarMutation.mutateAsync(file),
  }
}
