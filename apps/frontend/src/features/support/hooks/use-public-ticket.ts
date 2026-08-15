"use client"

import { useMutation, useQuery } from "@tanstack/react-query"
import { queryKeys } from "@/infrastructure/query/query-keys"
import {
  createPublicTicket,
  getPublicTicketCategories,
} from "../api/public-support.api"
import type {
  CreatePublicTicketFormValues,
  CreatePublicTicketResponse,
} from "../schemas/public-ticket.schema"

/**
 * Categorias do formulário público de suporte. O endpoint responde 404
 * quando `PUBLIC_SUPPORT_FORM_ENABLED` está desligado no backend — sem
 * `retry: false` o React Query bateria 3x numa rota permanentemente fora.
 */
export function usePublicTicketCategories() {
  const { data = [], isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.publicSupport.categories(),
    queryFn: getPublicTicketCategories,
    retry: false,
    refetchOnWindowFocus: false,
  })

  return {
    categories: data,
    loading: isLoading,
    error: error instanceof Error ? error.message : null,
    refetch,
  }
}

/**
 * Abertura de chamado pelo formulário público. Sem invalidação de cache —
 * não há listagem pública de chamados para refletir o novo ticket.
 */
export function useCreatePublicTicket() {
  const mutation = useMutation({
    mutationFn: (payload: CreatePublicTicketFormValues) =>
      createPublicTicket(payload),
  })

  async function createNewPublicTicket(
    payload: CreatePublicTicketFormValues,
  ): Promise<CreatePublicTicketResponse> {
    return mutation.mutateAsync(payload)
  }

  return {
    createTicket: createNewPublicTicket,
    creating: mutation.isPending,
    error: mutation.error instanceof Error ? mutation.error.message : null,
  }
}
