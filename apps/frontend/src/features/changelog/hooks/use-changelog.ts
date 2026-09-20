"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiRequest } from "@/infrastructure/api/client"
import { queryKeys } from "@/infrastructure/query/query-keys"
import type { ChangelogResponse } from "../schemas/changelog.schema"

export function useChangelog() {
  return useQuery({
    queryKey: queryKeys.changelog.list(),
    queryFn: () => apiRequest<ChangelogResponse>("/changelog"),
  })
}

export function useMarkChangelogSeen() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (version: number) =>
      apiRequest<void>("/changelog/seen", {
        method: "POST",
        body: JSON.stringify({ version }),
      }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: queryKeys.changelog.all }),
  })
}
