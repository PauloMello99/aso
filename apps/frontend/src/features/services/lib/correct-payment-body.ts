import { parseReaisToCents } from "@/features/cashier/lib/money"
import type { CorrectServicePaymentFormValues } from "../schemas/services.schemas"
import type { CorrectPaymentBody } from "../hooks/use-correct-service-payment"

export function toCorrectPaymentBody(
  values: CorrectServicePaymentFormValues,
): CorrectPaymentBody {
  return {
    grossCents: parseReaisToCents(values.amount),
    paymentMethod: values.paymentMethod,
    description: values.description || undefined,
    transactedAt: values.transactedAt
      ? new Date(values.transactedAt).toISOString()
      : undefined,
  }
}
