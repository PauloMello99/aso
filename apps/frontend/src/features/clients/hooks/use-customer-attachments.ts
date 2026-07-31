"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiRequest } from "@/infrastructure/api/client"
import { queryKeys } from "@/infrastructure/query/query-keys"
import { buildAttachmentFormData } from "../lib/attachment-form"

export interface CustomerAttachment {
  id: string
  fileName: string
  contentType: string | null
  url: string
  downloadUrl: string
  createdAt: string
}

type CustomerAttachmentRecord = Omit<
  CustomerAttachment,
  "url" | "downloadUrl"
>

export function useCustomerAttachments(orgId: string, customerId: string | null) {
  const queryClient = useQueryClient()
  const key = queryKeys.customers.attachments(orgId, customerId ?? "")

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
    mutationFn: ({ file, baseName }: { file: File; baseName?: string }) =>
      apiRequest<CustomerAttachmentRecord>(
        `/orgs/${orgId}/customers/${customerId}/attachments`,
        { method: "POST", body: buildAttachmentFormData(file, baseName) },
      ),
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

  const renameMutation = useMutation({
    mutationFn: ({ id, baseName }: { id: string; baseName: string }) =>
      apiRequest<CustomerAttachmentRecord>(
        `/orgs/${orgId}/customers/${customerId}/attachments/${id}`,
        { method: "PATCH", body: JSON.stringify({ baseName }) },
      ),
    onSuccess: invalidate,
  })

  return {
    attachments: data,
    loading: isLoading,
    uploadAttachment: (file: File, baseName?: string) =>
      uploadMutation.mutateAsync({ file, baseName }),
    deleteAttachment: (id: string) => deleteMutation.mutateAsync(id),
    renameAttachment: async (attachmentId: string, baseName: string) => {
      await renameMutation.mutateAsync({ id: attachmentId, baseName })
    },
  }
}
