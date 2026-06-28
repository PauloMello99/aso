"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiRequest } from "@/infrastructure/api/client"

export interface CustomerAttachment {
  id: string
  fileName: string
  contentType: string | null
  url: string
  createdAt: string
}

export function useCustomerAttachments(orgId: string, customerId: string | null) {
  const queryClient = useQueryClient()
  const key = ["customer-attachments", orgId, customerId] as const

  const { data = [], isLoading } = useQuery({
    queryKey: key,
    queryFn: () =>
      apiRequest<CustomerAttachment[]>(
        `/orgs/${orgId}/customers/${customerId}/attachments`,
      ),
    enabled: !!orgId && !!customerId,
  })

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: key })
  }

  const uploadMutation = useMutation({
    mutationFn: (file: File) => {
      const form = new FormData()
      form.append("file", file)
      return apiRequest<CustomerAttachment>(
        `/orgs/${orgId}/customers/${customerId}/attachments`,
        { method: "POST", body: form },
      )
    },
    onSuccess: invalidate,
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest<void>(
        `/orgs/${orgId}/customers/${customerId}/attachments/${id}`,
        { method: "DELETE" },
      ),
    onSuccess: invalidate,
  })

  return {
    attachments: data,
    loading: isLoading,
    uploadAttachment: (file: File) => uploadMutation.mutateAsync(file),
    deleteAttachment: (id: string) => deleteMutation.mutateAsync(id),
  }
}
