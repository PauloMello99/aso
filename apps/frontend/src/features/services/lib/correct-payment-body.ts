import { parseReaisToCents } from "@/features/cashier/lib/money"
import type { CorrectServicePaymentFormValues } from "../schemas/services.schemas"
import type { CorrectPaymentBody } from "../hooks/use-correct-service-payment"

export function toCorrectPaymentBody(
  values: CorrectServicePaymentFormValues,
): CorrectPaymentBody {
  return {
    grossCents: parseReaisToCents(values.amount),
    paymentMethod: values.paymentMethod,
    // Espelha InstallmentsRequiresCreditCardConstraint do backend: fora do
    // crédito o form já reseta o campo, mas essa checagem é a rede de
    // segurança na borda de saída. `?? 1` cobre serviços de crédito legados
    // (installments null, pré-migration 0075) reabertos na correção sem que
    // o usuário troque a faixa.
    installments:
      values.paymentMethod === "credit_card"
        ? (values.installments ?? 1)
        : undefined,
    description: values.description || undefined,
    transactedAt: values.transactedAt
      ? new Date(values.transactedAt).toISOString()
      : undefined,
  }
}
