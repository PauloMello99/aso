import { z } from "zod"

const PAYMENT_METHODS = [
  "cash",
  "bank_transfer",
  "credit_card",
  "debit_card",
] as const

// Valor monetário em reais: "1234.56" ou "1.234,56".
const moneyString = z
  .string()
  .min(1, "Informe um valor")
  .regex(
    /^\d{1,3}(\.\d{3})*(,\d{1,2})?$|^\d+([.,]\d{1,2})?$/,
    "Informe um valor válido (ex.: 150,00)",
  )

// Linha de material: ou quantidade (não-compartilhável) ou "acabou?" (compartilhável).
export const serviceMaterialLineSchema = z.object({
  materialId: z.string().min(1),
  shareable: z.boolean(),
  /** Quantidade em string editável (material não-compartilhável). */
  quantity: z.string().optional().or(z.literal("")),
  /** "Acabou?" (material compartilhável). */
  finished: z.boolean().optional(),
})

export const serviceSchema = z.object({
  customerId: z.string().min(1, "Selecione o cliente"),
  serviceTypeId: z.string().optional().or(z.literal("")),
  performedBy: z.string().optional().or(z.literal("")),
  description: z.string().max(500).optional().or(z.literal("")),
  amount: moneyString,
  paymentMethod: z.enum(PAYMENT_METHODS),
  paymentStatus: z.enum(["paid", "pending"]),
  performedAt: z.string().optional().or(z.literal("")),
  materials: z.array(serviceMaterialLineSchema),
})

export type ServiceFormValues = z.infer<typeof serviceSchema>
export type ServiceMaterialLineValues = z.infer<typeof serviceMaterialLineSchema>
