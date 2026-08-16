import { ApiError } from "@/infrastructure/api/client"

const GENERIC_MESSAGE = "Não foi possível concluir a operação de billing."

const CODE_MESSAGES: Record<string, string> = {
  BILLING_PLAN_NOT_FOUND: "Plano não encontrado no catálogo.",
  STRIPE_CATALOG_SYNC_FAILED:
    "A sincronização com o Stripe falhou. Verifique o relatório abaixo e tente novamente.",
  INVALID_BILLING_PLAN_UPDATE:
    "Alteração inválida: o valor do plano só muda por rotação de preço, e ao menos um campo válido deve ser enviado.",
  INVALID_COUPON_CONFIG:
    "Configuração de cupom inválida: informe percentual OU valor fixo, e duração em meses apenas para duração recorrente.",
  BILLING_COUPON_NOT_FOUND: "Cupom não encontrado.",
}

// Códigos cuja mensagem do backend já é específica e útil (pt-BR) — o backend
// emite frases diferentes sob o mesmo código (ex: INVALID_COUPON_CONFIG cobre
// XOR de desconto, percentOff não-inteiro, currency ausente, durationInMonths,
// maxRedemptions, expiresAt no passado). Preferir err.message nesses casos;
// cair no texto fixo do dicionário só quando a mensagem vier vazia/ausente.
const CODES_PREFERRING_BACKEND_MESSAGE = new Set([
  "INVALID_COUPON_CONFIG",
  "INVALID_BILLING_PLAN_UPDATE",
  "STRIPE_CATALOG_SYNC_FAILED",
])

// client.ts usa esse texto como fallback técnico quando a resposta de erro não
// trouxe `body.message` (ex: corpo vazio) — não é uma mensagem de negócio, não
// deve ser exibida ao admin como se fosse.
function isTechnicalFallbackMessage(message: string): boolean {
  return /^Request failed with status \d+$/.test(message)
}

export function billingErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.code) {
      if (CODES_PREFERRING_BACKEND_MESSAGE.has(err.code)) {
        if (err.message && !isTechnicalFallbackMessage(err.message)) {
          return err.message
        }
        return CODE_MESSAGES[err.code] ?? GENERIC_MESSAGE
      }
      const mapped = CODE_MESSAGES[err.code]
      if (mapped) return mapped
      // client.ts já traduz SUBSCRIPTION_REQUIRED para uma mensagem pt-BR
      // específica em ApiError.message — não engolir com o fallback genérico.
      if (err.code === "SUBSCRIPTION_REQUIRED") return err.message
    }
    return GENERIC_MESSAGE
  }
  if (err instanceof Error) return err.message
  return GENERIC_MESSAGE
}
