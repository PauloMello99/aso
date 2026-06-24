import { z } from "zod"

const positiveNumericString = z
  .string()
  .min(1, "Campo obrigatório")
  .regex(/^\d+(\.\d{1,2})?$/, "Informe um número positivo (ex: 10 ou 5.50)")

const optionalPositiveNumericString = z
  .string()
  .regex(/^\d+(\.\d{1,2})?$/, "Informe um número positivo (ex: 10 ou 5.50)")
  .optional()
  .or(z.literal(""))

export const materialSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(100, "Máximo 100 caracteres"),
  shareable: z.boolean().optional(),
  minimumQuantity: optionalPositiveNumericString,
  costPerUnit: optionalPositiveNumericString,
})

export type MaterialFormValues = z.infer<typeof materialSchema>

export const restockSchema = z.object({
  quantity: positiveNumericString,
  note: z.string().max(255).optional().or(z.literal("")),
})

export type RestockFormValues = z.infer<typeof restockSchema>

export const adjustStockSchema = z.object({
  // Separado e travado: direção (+/−) + quantidade só-número. O delta com sinal
  // é montado na submissão (ver stock-page handleAdjust).
  direction: z.enum(["add", "remove"]),
  quantity: positiveNumericString,
  note: z.string().max(255).optional().or(z.literal("")),
})

export type AdjustStockFormValues = z.infer<typeof adjustStockSchema>
