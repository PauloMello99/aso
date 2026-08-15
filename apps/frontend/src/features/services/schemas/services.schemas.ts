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

export const serviceMaterialLineSchema = z.object({
  materialId: z.string().min(1),
  shareable: z.boolean(),
  quantity: z
    .string()
    .optional()
    .or(z.literal(""))
    .refine(
      (v) => !v || /^\d+$/.test(v),
      "Informe uma quantidade inteira (sem casas decimais)",
    ),
  finished: z.boolean().optional(),
})

export const serviceSchema = z.object({
  customerId: z.string().min(1, "Selecione o cliente"),
  serviceTypeId: z.string().min(1, "Selecione o tipo de serviço"),
  performedBy: z.string().optional().or(z.literal("")),
  description: z.string().max(500).optional().or(z.literal("")),
  amount: moneyString,
  paymentMethod: z.enum(PAYMENT_METHODS),
  paymentStatus: z.enum(["paid", "pending"]),
  performedAt: z.string().optional().or(z.literal("")),
  materials: z.array(serviceMaterialLineSchema),
  anamnesisResponseId: z.string().nullable().optional(),
})

function hasRealConsumption(line: ServiceMaterialLineValues): boolean {
  if (line.shareable) return !!line.finished
  return Number(line.quantity) > 0
}

export const createServiceSchema = serviceSchema
  .extend({
    materials: z
      .array(serviceMaterialLineSchema)
      .min(1, "Selecione ao menos um material consumido"),
  })
  .superRefine((values, ctx) => {
    if (values.materials.length > 0 && !values.materials.some(hasRealConsumption)) {
      ctx.addIssue({
        code: "custom",
        path: ["materials"],
        message:
          'Nenhum material terá consumo registrado: marque "Acabou?" nos compartilháveis ou informe a quantidade dos demais.',
      })
    }
  })

export type ServiceFormValues = z.infer<typeof serviceSchema>
export type ServiceMaterialLineValues = z.infer<typeof serviceMaterialLineSchema>

export const correctServicePaymentSchema = z.object({
  amount: moneyString,
  paymentMethod: z.enum(PAYMENT_METHODS),
  description: z.string().max(500).optional().or(z.literal("")),
  transactedAt: z.string().optional().or(z.literal("")),
})

export type CorrectServicePaymentFormValues = z.infer<
  typeof correctServicePaymentSchema
>
