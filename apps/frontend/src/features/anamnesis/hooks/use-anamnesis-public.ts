"use client"

import { useMutation, useQuery } from "@tanstack/react-query"
import { apiRequest } from "@/infrastructure/api/client"
import { queryKeys } from "@/infrastructure/query/query-keys"
import type { AnamnesisAnswerInput, AnamnesisPublicLookup } from "../types"

/** Consulta pública da ficha de anamnese pelo token (sem auth). */
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
    // Página pública preenchida ao vivo pelo cliente — não refazer a consulta
    // em background (ex.: focus da aba) enquanto ele está respondendo, senão
    // o formulário poderia ser desmontado/resetado no meio do preenchimento.
    refetchOnWindowFocus: false,
  })
}

interface SubmitAnamnesisResponseBody {
  answers: AnamnesisAnswerInput[]
}

/** Envio público das respostas da ficha de anamnese (sem auth, throttled no backend). */
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
