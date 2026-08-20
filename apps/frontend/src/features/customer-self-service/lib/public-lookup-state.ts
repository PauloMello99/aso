import { ApiError } from "@/infrastructure/api/client"

export type PublicLookupErrorState =
  | "invalid"
  | "expired"
  | "already_submitted"
  | "error"

export interface PublicLookupErrorCodes {
  expired: string
  alreadySubmitted: string
}

/**
 * Os use-cases de GET público (registro/atualização) lançam exceção para os 3
 * casos (not-found, expired, already-submitted) em vez de retornar um `status`
 * no corpo — diferente do padrão de anamnese, que retorna `status: "expired"`.
 * Por isso o estado da tela precisa vir do `code`/`status` do erro da query,
 * não de `lookup.status`.
 *
 * Distinguimos falha de transporte (rede, timeout, 5xx — `status` 0 ou >= 500
 * em `client.ts`) de rejeição de negócio (4xx real vindo do backend): a
 * primeira categoria vira "error", com opção de tentar de novo, porque não é
 * o link que está errado — é uma indisponibilidade momentânea. Um `ApiError`
 * 4xx com `code` desconhecido (não expired/already-submitted) ainda é uma
 * resposta de contrato do backend dizendo que o token não existe, então
 * continua caindo em "invalid".
 */
export function resolvePublicLookupErrorState(
  error: unknown,
  codes: PublicLookupErrorCodes,
): PublicLookupErrorState {
  if (!(error instanceof ApiError)) return "error"
  if (error.code === codes.expired) return "expired"
  if (error.code === codes.alreadySubmitted) return "already_submitted"
  if (error.status === 0 || error.status >= 500) return "error"
  return "invalid"
}
