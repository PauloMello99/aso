import { ApiError } from "@/infrastructure/api/client"

export type PublicLookupErrorState = "invalid" | "expired" | "already_submitted"

export interface PublicLookupErrorCodes {
  expired: string
  alreadySubmitted: string
}

/**
 * Os use-cases de GET público (registro/atualização) lançam exceção para os 3
 * casos (not-found, expired, already-submitted) em vez de retornar um `status`
 * no corpo — diferente do padrão de anamnese, que retorna `status: "expired"`.
 * Por isso o estado da tela precisa vir do `code` do erro da query, não de
 * `lookup.status`. Qualquer code não mapeado (incl. falha de rede) cai em
 * "invalid" — não vazamos detalhe do erro real.
 */
export function resolvePublicLookupErrorState(
  error: unknown,
  codes: PublicLookupErrorCodes,
): PublicLookupErrorState {
  if (error instanceof ApiError && error.code === codes.expired) return "expired"
  if (error instanceof ApiError && error.code === codes.alreadySubmitted) {
    return "already_submitted"
  }
  return "invalid"
}
