import { z } from "zod"
// Import direto do módulo (não do barrel @/features/cashier) para evitar
// puxar o grafo de componentes de cashier — mesmo padrão de
// service-form.tsx/services-page.tsx, que importam de "@/features/cashier/lib/*".
import { MAX_INSTALLMENTS } from "@/features/cashier/types"

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

// Mesmo teto do seletor de parcelas do caixa (cashier.schemas.ts) — reusa a
// constante de cashier em vez de duplicar o número.
const installmentsNumber = z
  .number()
  .int("Parcelas deve ser um número inteiro")
  .min(1, "Mínimo de 1 parcela")
  .max(MAX_INSTALLMENTS, `Máximo de ${MAX_INSTALLMENTS} parcelas`)

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
  // Snapshot do material no momento em que a linha foi adicionada — a lista
  // de materiais agora é resultado de busca assíncrona, então não dá mais
  // para resolver nome/estoque via materials.find() sobre uma lista
  // completa. Nunca enviado à API (toCreateBody monta o payload explicitamente).
  name: z.string().optional(),
  stockQuantity: z.string().optional(),
})

export const serviceSchema = z.object({
  customerId: z.string().min(1, "Selecione o cliente"),
  serviceTypeId: z.string().min(1, "Selecione o tipo de serviço"),
  performedBy: z.string().optional().or(z.literal("")),
  description: z.string().max(500).optional().or(z.literal("")),
  amount: moneyString,
  paymentMethod: z.enum(PAYMENT_METHODS),
  // Só relevante para paymentMethod credit_card (form mostra o seletor só
  // nesse caso — cross-validação no superRefine de createServiceSchema,
  // mesmo padrão de transactionSchema em cashier.schemas.ts).
  installments: installmentsNumber.optional(),
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
    // Espelha o CHECK do banco (services_installments_check, migration
    // 0074): installments > 1 só é aceito com paymentMethod credit_card.
    if (
      values.installments !== undefined &&
      values.installments !== 1 &&
      values.paymentMethod !== "credit_card"
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["installments"],
        message: "Parcelamento só é permitido em cartão de crédito",
      })
    }
  })

export type ServiceFormValues = z.infer<typeof serviceSchema>
export type ServiceMaterialLineValues = z.infer<typeof serviceMaterialLineSchema>

export const correctServicePaymentSchema = z
  .object({
    amount: moneyString,
    paymentMethod: z.enum(PAYMENT_METHODS),
    installments: installmentsNumber.optional(),
    description: z.string().max(500).optional().or(z.literal("")),
    transactedAt: z.string().optional().or(z.literal("")),
  })
  // Mesmo CHECK do banco espelhado em createServiceSchema/transactionSchema.
  .refine(
    (values) =>
      values.installments === undefined ||
      values.installments === 1 ||
      values.paymentMethod === "credit_card",
    {
      message: "Parcelamento só é permitido em cartão de crédito",
      path: ["installments"],
    },
  )

export type CorrectServicePaymentFormValues = z.infer<
  typeof correctServicePaymentSchema
>
