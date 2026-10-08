import { z } from "zod"

/**
 * Espelha os DTOs/contratos do módulo `quotes` do backend
 * (`apps/backend/src/modules/quotes`). Limites e regex devem acompanhar o
 * backend; a validação final é sempre do servidor.
 */

export const MAX_QUOTE_IMAGES = 3
export const MAX_QUOTE_IMAGE_BYTES = 5 * 1024 * 1024
export const ACCEPTED_QUOTE_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
] as const

export const QUOTE_IDEA_MAX_LENGTH = 2000

// Igual a QUOTE_FORM_SLUG_PATTERN do backend (3..40, sem hífen nas bordas).
const QUOTE_FORM_SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/

export const publicQuoteFormSchema = z.object({
  studioName: z.string(),
  professionalName: z.string(),
  consent: z.object({
    version: z.string(),
    privacyText: z.string(),
    contactRetentionText: z.string(),
  }),
})

export type PublicQuoteForm = z.infer<typeof publicQuoteFormSchema>

export const submitQuoteRequestFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Informe seu nome")
    .max(120, "Máximo 120 caracteres"),
  phone: z
    .string()
    .trim()
    .refine((value) => {
      const digits = value.replace(/\D/g, "").length
      return digits >= 10 && digits <= 15
    }, "Telefone inválido. Inclua o DDD"),
  email: z
    .string()
    .trim()
    .min(1, "Informe seu e-mail")
    .max(254, "Máximo 254 caracteres")
    .email("E-mail inválido"),
  idea: z
    .string()
    .trim()
    .min(1, "Conte um pouco sobre a sua ideia")
    .max(QUOTE_IDEA_MAX_LENGTH, `Máximo ${QUOTE_IDEA_MAX_LENGTH} caracteres`),
  privacyConsent: z
    .boolean()
    .refine((value) => value === true, "É necessário aceitar para continuar"),
  contactRetentionConsent: z.boolean(),
  turnstileToken: z.string().min(1, "Verificação obrigatória"),
})

export type SubmitQuoteRequestFormValues = z.infer<
  typeof submitQuoteRequestFormSchema
>

export const submitQuoteRequestResponseSchema = z.object({
  received: z.literal(true),
})

export const myQuoteFormRecordSchema = z.object({
  slug: z.string(),
  displayName: z.string(),
  enabled: z.boolean(),
})

export type MyQuoteFormRecord = z.infer<typeof myQuoteFormRecordSchema>

export const myQuoteFormSchema = z.object({
  form: myQuoteFormRecordSchema.nullable(),
  canConfigure: z.boolean(),
})

export type MyQuoteForm = z.infer<typeof myQuoteFormSchema>

export const upsertMyQuoteFormSchema = z.object({
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, "Mínimo 3 caracteres")
    .max(40, "Máximo 40 caracteres")
    .refine(
      (value) => QUOTE_FORM_SLUG_PATTERN.test(value),
      "Use apenas letras minúsculas, números e hífen (sem hífen no início ou fim)",
    )
    .refine(
      (value) => !value.includes("--"),
      "Não use dois hífens seguidos",
    ),
  displayName: z
    .string()
    .trim()
    .min(1, "Informe o nome público")
    .max(80, "Máximo 80 caracteres"),
  enabled: z.boolean(),
})

export type UpsertMyQuoteFormValues = z.infer<typeof upsertMyQuoteFormSchema>
