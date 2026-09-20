import { parseReaisToCents } from "@/features/cashier/lib/money"
import type { CreateServiceBody, UpdateServiceBody } from "../hooks/use-services"
import type { ServiceFormValues } from "../schemas/services.schemas"

export function toCreateBody(values: ServiceFormValues): CreateServiceBody {
  return {
    customerId: values.customerId,
    serviceTypeId: values.serviceTypeId || null,
    performedBy: values.performedBy || null,
    description: values.description || null,
    anamnesisResponseId: values.anamnesisResponseId,
    amountCents: parseReaisToCents(values.amount),
    paymentMethod: values.paymentMethod,
    // Espelha InstallmentsRequiresCreditCardConstraint do backend: fora do
    // crédito o form já reseta o campo, mas essa checagem é a rede de
    // segurança na borda de saída. `?? 1` garante uma faixa explícita.
    installments:
      values.paymentMethod === "credit_card"
        ? (values.installments ?? 1)
        : undefined,
    paymentStatus: values.paymentStatus,
    performedAt: values.performedAt
      ? new Date(values.performedAt).toISOString()
      : undefined,
    materials: values.materials.map((line) =>
      line.shareable
        ? { materialId: line.materialId, finished: !!line.finished }
        : {
            materialId: line.materialId,
            quantity: line.quantity
              ? Number(line.quantity.replace(",", "."))
              : 0,
          },
    ),
  }
}

export function toUpdateBody(values: ServiceFormValues): UpdateServiceBody {
  return {
    customerId: values.customerId,
    serviceTypeId: values.serviceTypeId || null,
    performedBy: values.performedBy || null,
    description: values.description || null,
    anamnesisResponseId: values.anamnesisResponseId,
    performedAt: values.performedAt
      ? new Date(values.performedAt).toISOString()
      : undefined,
  }
}
