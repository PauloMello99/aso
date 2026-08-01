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

const CATEGORY_GENERIC_MESSAGE = "Não foi possível salvar a categoria."

const CATEGORY_CODE_MESSAGES: Record<string, string> = {
  TRANSACTION_CATEGORY_NAME_CONFLICT: "Já existe uma categoria com esse nome.",
  TRANSACTION_CATEGORY_NOT_FOUND: "Categoria não encontrada.",
  TRANSACTION_CATEGORY_PROTECTED: "Esta categoria não pode ser excluída.",
}

export function categoryErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.code) {
      const mapped = CATEGORY_CODE_MESSAGES[err.code]
      if (mapped) return mapped
      // client.ts já traduz SUBSCRIPTION_REQUIRED para uma mensagem pt-BR
      // específica em ApiError.message — não engolir com o fallback genérico.
      if (err.code === "SUBSCRIPTION_REQUIRED") return err.message
    }
    return CATEGORY_GENERIC_MESSAGE
  }
  if (err instanceof Error) return err.message
  return CATEGORY_GENERIC_MESSAGE
}
