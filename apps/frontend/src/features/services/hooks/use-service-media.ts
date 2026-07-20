"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiRequest } from "@/infrastructure/api/client"
import { queryKeys } from "@/infrastructure/query/query-keys"

export interface ServiceMedia {
  id: string
  fileName: string
  contentType: string | null
  url: string
  createdAt: string
}

export function useServiceMedia(orgId: string, serviceId: string | null) {
  const queryClient = useQueryClient()
  const key = queryKeys.services.media(orgId, serviceId ?? "")

  const { data = [], isLoading } = useQuery({
    queryKey: key,
    queryFn: () =>
      apiRequest<ServiceMedia[]>(`/orgs/${orgId}/services/${serviceId}/media`),
    enabled: !!orgId && !!serviceId,
  })

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: key })
  }

  const uploadMutation = useMutation({
    mutationFn: (file: File) => {
      const form = new FormData()
      form.append("file", file)
      return apiRequest<Omit<ServiceMedia, "url">>(
        `/orgs/${orgId}/services/${serviceId}/media`,
        { method: "POST", body: form },
      )
    },
    onSuccess: invalidate,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest<void>(`/orgs/${orgId}/services/${serviceId}/media/${id}`, {
        method: "DELETE",
      }),
    onSuccess: invalidate,
  })

  return {
    media: data,
    loading: isLoading,
    uploadMedia: (file: File) => uploadMutation.mutateAsync(file),
    deleteMedia: (id: string) => deleteMutation.mutateAsync(id),
  }
}
