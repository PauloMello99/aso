"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ApiError } from "@/infrastructure/api/client"
import { queryKeys } from "@/infrastructure/query/query-keys"
import { getMyQuoteForm, upsertMyQuoteForm } from "../api/quote-forms.api"
import type { UpsertMyQuoteFormValues } from "../schemas/quote-form.schema"

const FIVE_MINUTES_MS = 5 * 60 * 1000

/**
 * Formulário de orçamento do próprio membro. 404 = recurso desligado no
 * backend (flag `PUBLIC_QUOTE_FORM_ENABLED`, não exposta ao frontend — ADR-0035),
 * por isso `notFound`/`available` são o único sinal de disponibilidade.
 */
export function useMyQuoteForm(orgId: string) {
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.quoteForms.mine(orgId),
    queryFn: () => getMyQuoteForm(orgId),
    enabled: !!orgId,
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: FIVE_MINUTES_MS,
  })

  const notFound = error instanceof ApiError && error.status === 404

  return {
    data: data ?? null,
    loading: isLoading,
    notFound,
    /** Só `true` depois de a API confirmar a disponibilidade. */
    available: data !== undefined,
    error: error && !notFound ? error : null,
  }
}

export function useUpsertMyQuoteForm(orgId: string) {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (body: UpsertMyQuoteFormValues) =>
      upsertMyQuoteForm(orgId, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.quoteForms.mine(orgId),
      })
    },
  })

  return {
    save: mutation.mutateAsync,
    saving: mutation.isPending,
  }
}
