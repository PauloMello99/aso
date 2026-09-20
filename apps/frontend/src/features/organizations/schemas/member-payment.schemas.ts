import { z } from "zod"
import { parseReaisToCents } from "@/features/cashier/lib/money"

const PAYMENT_METHODS = [
  "cash",
  "bank_transfer",
  "credit_card",
  "debit_card",
] as const

const moneyString = z
  .string()
  .min(1, "Informe um valor")
  .regex(
    /^\d{1,3}(\.\d{3})*(,\d{1,2})?$|^\d+([.,]\d{1,2})?$/,
    "Informe um valor válido (ex.: 150,00)",
  )

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

// Mesmo formato "yyyy-MM-dd" devolvido pelo DatePicker (shared/components/ui/
// date-picker.tsx) — nunca `Date` aqui, para não deslocar fuso (ver comentário
// em member-payment.entity.ts no backend).
const dateString = z
  .string()
  .regex(DATE_PATTERN, "Data inválida")
  .optional()
  .or(z.literal(""))

// Estado do formulário (react-hook-form) — valor em reais, string digitável.
// Usado tanto para registrar um pagamento novo quanto para corrigir um
// existente (mesmo shape aceito pelos dois endpoints no backend, ver
// create-member-payment.dto.ts).
export const memberPaymentFormSchema = z
  .object({
    amount: moneyString,
    paymentMethod: z.enum(PAYMENT_METHODS),
    description: z.string().max(500).optional().or(z.literal("")),
    periodStart: dateString,
    periodEnd: dateString,
  })
  .refine(
    // yyyy-MM-dd compara corretamente como string (ordem lexicográfica).
    (v) => !v.periodStart || !v.periodEnd || v.periodStart <= v.periodEnd,
    {
      message: "A data final não pode ser anterior à data inicial",
      path: ["periodEnd"],
    },
  )

export type MemberPaymentFormValues = z.infer<typeof memberPaymentFormSchema>

// Shape de SUBMIT (borda reais -> centavos): amountCents inteiro > 0, nunca
// float no estado depois desta conversão. Espelha CreateMemberPaymentDto do
// backend.
export const memberPaymentBodySchema = z.object({
  amountCents: z
    .number()
    .int("Valor inválido")
    .positive("Valor deve ser maior que zero"),
  paymentMethod: z.enum(PAYMENT_METHODS),
  description: z.string().max(500).optional(),
  periodStart: z.string().regex(DATE_PATTERN).optional(),
  periodEnd: z.string().regex(DATE_PATTERN).optional(),
})

export type MemberPaymentBody = z.infer<typeof memberPaymentBodySchema>

// Converte os valores do formulário (reais) para o body da API (centavos
// inteiros) na borda de submit — nunca reintroduz float no estado depois
// disso. `memberPaymentBodySchema.parse` age como defesa em profundidade: se
// a conversão produzir um valor inválido (NaN de `amount` mal digitado que
// escapou do regex do form, por exemplo), falha aqui em vez de virar body
// inválido silencioso para a API.
export function toMemberPaymentBody(
  values: MemberPaymentFormValues,
): MemberPaymentBody {
  return memberPaymentBodySchema.parse({
    amountCents: parseReaisToCents(values.amount),
    paymentMethod: values.paymentMethod,
    description: values.description?.trim()
      ? values.description.trim()
      : undefined,
    periodStart: values.periodStart ? values.periodStart : undefined,
    periodEnd: values.periodEnd ? values.periodEnd : undefined,
  })
}
