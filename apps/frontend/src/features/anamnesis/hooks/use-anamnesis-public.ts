"use client"

import { useMutation, useQuery } from "@tanstack/react-query"
import { apiRequest } from "@/infrastructure/api/client"
import { queryKeys } from "@/infrastructure/query/query-keys"
import type { AnamnesisAnswerInput, AnamnesisPublicLookup } from "../types"

export function useAnamnesisPublicLookup(token: string | undefined) {
  return useQuery({
    queryKey: queryKeys.anamnesis.publicResponse(token ?? ""),
    queryFn: () =>
      apiRequest<AnamnesisPublicLookup>(
        `/public/anamnesis-responses/${encodeURIComponent(token!)}`,
        { skipAuth: true },
      ),
    enabled: !!token,
    retry: false,
    refetchOnWindowFocus: false,
  })
}

interface SubmitAnamnesisResponseBody {
  answers: AnamnesisAnswerInput[]
  signerFullName: string
  signerCpf?: string
  signatureImageBase64: string
}

export function useSubmitAnamnesisResponse(token: string | undefined) {
  return useMutation({
    mutationFn: (body: SubmitAnamnesisResponseBody) =>
      apiRequest<void>(
        `/public/anamnesis-responses/${encodeURIComponent(token!)}/submit`,
        {
          method: "POST",
          body: JSON.stringify(body),
          skipAuth: true,
        },
      ),
  })
}
