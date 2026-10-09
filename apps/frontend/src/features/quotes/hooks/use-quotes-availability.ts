"use client"

import { useMyQuoteForm } from "./use-my-quote-form"

/**
 * Disponibilidade do módulo Orçamentos. A flag do backend não é exposta ao
 * frontend (ADR-0035): `GET /orgs/:orgId/quote-forms/me` responde 404 com a flag
 * desligada, então qualquer falha conta como indisponível. `settled` só vira
 * `true` quando a resposta (ou o erro) chegou.
 */
export function useQuotesAvailability(orgId: string) {
  const { available, loading } = useMyQuoteForm(orgId)
  return { available, settled: !!orgId && !loading }
}
