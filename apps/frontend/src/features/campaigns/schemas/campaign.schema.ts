import { z } from "zod"

export const campaignTriggerSchema = z.enum([
  "post_service",
  "birthday",
  "inactivity",
])

/**
 * Shape MÍNIMO do documento Tiptap-JSON. Só garante que a raiz é
 * `{ type: "doc", content: [...] }` — o suficiente para o formulário não
 * enviar lixo óbvio. A sanitização REAL (nós permitidos, marcas, tokens) é o
 * walker do servidor (`validateCampaignBody`). Os nós internos ficam soltos
 * de propósito: não replicamos o schema do Tiptap aqui.
 */
const tiptapNodeSchema = z.looseObject({ type: z.string() })

export const campaignBodySchema = z.object({
  type: z.literal("doc"),
  content: z.array(tiptapNodeSchema),
})

const campaignNameSchema = z
  .string()
  .trim()
  .min(1, "Informe um nome para a campanha")
  .max(80, "Use no máximo 80 caracteres")
  .regex(/\S/, "O nome não pode conter apenas espaços")

const campaignSubjectSchema = z
  .string()
  .max(200, "Use no máximo 200 caracteres")

const inactivityMonthsSchema = z
  .number()
  .int("Informe um número inteiro de meses")
  .min(1, "Mínimo de 1 mês")
  .max(36, "Máximo de 36 meses")

/** Campanha como retornada pelo backend (`GET /orgs/:orgId/campaigns`). */
export const campaignSchema = z.object({
  id: z.string(),
  orgId: z.string(),
  trigger: campaignTriggerSchema,
  name: z.string(),
  enabled: z.boolean(),
  subject: z.string().nullable(),
  body: campaignBodySchema.nullable(),
  inactivityMonths: z.number().int().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})

/** Resposta completa de `GET /orgs/:orgId/campaigns`. */
export const listCampaignsResponseSchema = z.object({
  campaigns: z.array(campaignSchema),
  campaignsEnabled: z.boolean(),
  availableTriggers: z.array(campaignTriggerSchema),
  defaults: z.record(
    campaignTriggerSchema,
    z.object({ subject: z.string(), body: campaignBodySchema }),
  ),
})

/**
 * Payload de `POST /orgs/:orgId/campaigns`. Espelha `CreateCampaignDto` do
 * backend: `name` 1..80 + `/\S/` (mesmo `@Matches` do DTO), `subject` <=200,
 * `inactivityMonths` 1..36 e obrigatório apenas para o gatilho `inactivity`.
 */
export const createCampaignSchema = z
  .object({
    trigger: campaignTriggerSchema,
    name: campaignNameSchema,
    subject: campaignSubjectSchema.nullish(),
    body: campaignBodySchema.nullish(),
    inactivityMonths: inactivityMonthsSchema.nullish(),
  })
  .refine(
    (data) =>
      data.trigger !== "inactivity" ||
      (data.inactivityMonths !== null && data.inactivityMonths !== undefined),
    {
      message: "Informe o período de inatividade (em meses)",
      path: ["inactivityMonths"],
    },
  )

/**
 * Payload de `PATCH /orgs/:orgId/campaigns/:id`. Todos os campos opcionais;
 * SEM `trigger` (imutável após a criação — o backend nem o aceita). Chaves
 * desconhecidas são removidas (comportamento padrão do `z.object`).
 */
export const updateCampaignSchema = z.object({
  name: campaignNameSchema.optional(),
  enabled: z.boolean().optional(),
  subject: campaignSubjectSchema.nullable().optional(),
  body: campaignBodySchema.nullable().optional(),
  inactivityMonths: inactivityMonthsSchema.nullable().optional(),
})

export type Campaign = z.infer<typeof campaignSchema>
export type CampaignBody = z.infer<typeof campaignBodySchema>
export type ListCampaignsResponse = z.infer<typeof listCampaignsResponseSchema>
export type CreateCampaignInput = z.infer<typeof createCampaignSchema>
export type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>
