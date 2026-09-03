"use client"

import { useMutation } from "@tanstack/react-query"
import { apiRequest } from "@/infrastructure/api/client"

/**
 * Upload de uma imagem para o corpo rich-text de campanhas (T6 rework, Fatia
 * 17a expõe `POST /orgs/:orgId/campaigns/images`, multipart campo `file`,
 * owner-only, máx. 2 MB, jpeg/png/webp/gif). Devolve a URL pública do bucket
 * `campaign-images`, que o editor grava em `image.src`.
 *
 * Sem invalidação de query: a URL entra no `body` do form do Sheet, não há
 * cache a mexer. `apiRequest` já omite `Content-Type` para `FormData`.
 */
export function useUploadCampaignImage(orgId: string) {
  const mutation = useMutation({
    mutationFn: (file: File) => {
      const form = new FormData()
      form.append("file", file)
      return apiRequest<{ url: string }>(`/orgs/${orgId}/campaigns/images`, {
        method: "POST",
        body: form,
      })
    },
  })

  return {
    uploadImage: (file: File) => mutation.mutateAsync(file),
    uploading: mutation.isPending,
    error: mutation.error,
  }
}
