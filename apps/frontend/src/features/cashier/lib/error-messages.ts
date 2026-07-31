import { ApiError } from "@/infrastructure/api/client"

const GENERIC_MESSAGE = "Não foi possível corrigir."

const CODE_MESSAGES: Record<string, string> = {
  SERVICE_PAYMENT_NOT_CORRECTABLE:
    "Este pagamento de serviço não pode mais ser corrigido (serviço cancelado ou transação já estornada).",
  SERVICE_ALREADY_CANCELED: "O serviço vinculado a este lançamento foi cancelado.",
  TRANSACTION_IS_SERVICE_PAYMENT:
    "Este lançamento veio de um serviço — use a correção de pagamento do serviço.",
  SERVICE_NOT_FOUND: "Serviço não encontrado.",
  SERVICE_FORBIDDEN: "Você não tem permissão para corrigir este pagamento.",
  TRANSACTION_NOT_FOUND: "Lançamento não encontrado.",
  TRANSACTION_NOT_REVERSIBLE: "Este lançamento não pode mais ser estornado.",
  TRANSACTION_ALREADY_REVERSED: "Este lançamento já foi estornado.",
  CASHIER_FORBIDDEN: "Você não tem permissão para realizar esta ação no caixa.",
}

export function cashierErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.code) {
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
