import { z } from "zod"
import { isValidPhoneNumber } from "libphonenumber-js/max"

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const GENDERS = ["male", "female", "other"] as const

export const requiredEmail = z
  .string()
  .min(1, "E-mail é obrigatório")
  .max(255, "Máximo 255 caracteres")
  .refine((v) => z.email().safeParse(v).success, "E-mail inválido")

export const customerSchema = z.object({
  name: z
    .string()
    .min(1, "Nome é obrigatório")
    .max(120, "Máximo 120 caracteres"),
  email: requiredEmail,
  phone: z
    .string()
    .max(30, "Máximo 30 caracteres")
    .optional()
    .refine((v) => !v || isValidPhoneNumber(v), "Telefone inválido"),
  gender: z
    .string()
    .optional()
    .refine(
      (v) => !v || (GENDERS as readonly string[]).includes(v),
      "Gênero inválido",
    ),
  birthDate: z
    .string()
    .min(1, "Nascimento é obrigatório")
    .refine((v) => DATE_RE.test(v), "Data inválida"),
  address: z
    .string()
    .min(1, "Endereço é obrigatório")
    .max(255, "Máximo 255 caracteres"),
  addressLine2: z.string().max(255, "Máximo 255 caracteres").optional(),
  number: z
    .string()
    .min(1, "Número é obrigatório")
    .max(20, "Máximo 20 caracteres"),
  city: z
    .string()
    .min(1, "Cidade é obrigatória")
    .max(120, "Máximo 120 caracteres"),
  state: z
    .string()
    .min(1, "Estado é obrigatório")
    .max(120, "Máximo 120 caracteres"),
  postalCode: z.string().max(20, "Máximo 20 caracteres").optional(),
  country: z.string().max(2, "Use o código ISO de 2 letras").optional(),
  originId: z.string().optional(),
  notes: z.string().max(1000, "Máximo 1000 caracteres").optional(),
})

export type CustomerFormValues = z.infer<typeof customerSchema>
