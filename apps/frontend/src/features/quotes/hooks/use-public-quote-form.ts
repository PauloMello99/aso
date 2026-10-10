"use client"

import { useMutation, useQuery } from "@tanstack/react-query"
import { queryKeys } from "@/infrastructure/query/query-keys"
import { getPublicQuoteForm, submitQuoteRequest } from "../api/quote-forms.api"
import type { SubmitQuoteRequestFormValues } from "../schemas/quote-form.schema"

/**
 * Formulário público por slug. O backend responde 404 (mesma resposta) para
 * slug inexistente, desativado ou flag desligada — permanente, então sem retry.
 */
export function usePublicQuoteForm(slug: string | undefined) {
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.publicQuoteForm.bySlug(slug ?? ""),
    queryFn: () => getPublicQuoteForm(slug as string),
    enabled: !!slug,
    retry: false,
    refetchOnWindowFocus: false,
  })

  return { form: data ?? null, loading: isLoading, error }
}

export interface SubmitQuoteRequestInput {
  values: Omit<SubmitQuoteRequestFormValues, "turnstileToken">
  consentVersion: string
  files: File[]
  turnstileToken: string
}

/** Envio do pedido de orçamento. Sem invalidação: não há listagem pública. */
export function useSubmitQuoteRequest(slug: string) {
  const mutation = useMutation({
    mutationFn: (input: SubmitQuoteRequestInput) =>
      submitQuoteRequest(
        slug,
        { ...input.values, consentVersion: input.consentVersion },
        input.files,
        input.turnstileToken,
      ),
  })

  return {
    submit: mutation.mutateAsync,
    submitting: mutation.isPending,
  }
}
