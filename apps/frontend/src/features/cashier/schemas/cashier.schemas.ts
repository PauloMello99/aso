import { z } from "zod"

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

export const transactionSchema = z.object({
  description: z.string().min(1, "Descrição é obrigatória").max(200),
  type: z.enum(["income", "outcome"]),
  amount: moneyString,
  paymentMethod: z.enum(PAYMENT_METHODS),
  categoryId: z.string().optional().or(z.literal("")),
  createdBy: z.string().optional().or(z.literal("")),
  transactedAt: z.string().optional().or(z.literal("")),
})

export type TransactionFormValues = z.infer<typeof transactionSchema>

export const correctionSchema = transactionSchema

export type CorrectionFormValues = z.infer<typeof correctionSchema>

const percentString = z
  .string()
  .regex(/^\d+([.,]\d{1,2})?$/, "Percentual inválido")
  .or(z.literal(""))

const fixedString = z
  .string()
  .regex(/^\d+([.,]\d{1,2})?$/, "Valor inválido")
  .or(z.literal(""))

export const feeItemSchema = z.object({
  paymentMethod: z.enum(PAYMENT_METHODS),
  percent: percentString,
  fixed: fixedString,
})

export const feesSchema = z.object({
  fees: z.array(feeItemSchema),
})

export type FeesFormValues = z.infer<typeof feesSchema>

export const transactionCategorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Nome é obrigatório")
    .max(60, "Máximo de 60 caracteres"),
})

export type TransactionCategoryFormValues = z.infer<
  typeof transactionCategorySchema
>
