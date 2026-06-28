import { z } from "zod"

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const GENDERS = ["male", "female", "other"] as const

/** Optional e-mail field validated with zod's own e-mail validator. */
export const optionalEmail = z
  .string()
  .max(255, "Máximo 255 caracteres")
  .optional()
  .refine((v) => !v || z.email().safeParse(v).success, "E-mail inválido")

export const customerSchema = z.object({
  name: z
    .string()
    .min(1, "Nome é obrigatório")
    .max(120, "Máximo 120 caracteres"),
  email: optionalEmail,
  // Telefone armazenado em E.164 (ex: +5511999990000) pelo PhoneInput.
  phone: z
    .string()
    .max(30, "Máximo 30 caracteres")
    .optional()
    .refine((v) => !v || /^\+[1-9]\d{6,14}$/.test(v), "Telefone inválido"),
  gender: z
    .string()
    .optional()
    .refine(
      (v) => !v || (GENDERS as readonly string[]).includes(v),
      "Gênero inválido",
    ),
  birthDate: z
    .string()
    .optional()
    .refine((v) => !v || DATE_RE.test(v), "Data inválida"),
  address: z.string().max(255, "Máximo 255 caracteres").optional(),
  addressLine2: z.string().max(255, "Máximo 255 caracteres").optional(),
  city: z.string().max(120, "Máximo 120 caracteres").optional(),
  state: z.string().max(120, "Máximo 120 caracteres").optional(),
  postalCode: z.string().max(20, "Máximo 20 caracteres").optional(),
  country: z.string().max(2, "Use o código ISO de 2 letras").optional(),
  originId: z.string().optional(),
  notes: z.string().max(1000, "Máximo 1000 caracteres").optional(),
})

export type CustomerFormValues = z.infer<typeof customerSchema>
