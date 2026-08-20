import { z } from "zod"
import { isValidPhoneNumber } from "libphonenumber-js/max"

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const GENDERS = ["male", "female", "other"] as const

/**
 * Todos os campos são `z.string()` simples (nunca `.optional()`): o form
 * sempre preenche `defaultValues` com string ("" quando ausente no snapshot),
 * então o valor em runtime nunca é `undefined`. Isso mantém
 * `CustomerUpdateFormValues` com todas as chaves como `string`, o shape que
 * `buildPartialUpdateBody` espera.
 */
export const customerUpdateSchema = z.object({
  name: z
    .string()
    .min(1, "Nome é obrigatório")
    .max(120, "Máximo 120 caracteres"),
  email: z
    .string()
    .min(1, "E-mail é obrigatório")
    .max(255, "Máximo 255 caracteres")
    .refine((v) => z.email().safeParse(v).success, "E-mail inválido"),
  phone: z
    .string()
    .max(30, "Máximo 30 caracteres")
    .refine((v) => !v || isValidPhoneNumber(v), "Telefone inválido"),
  gender: z
    .string()
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
  addressLine2: z.string().max(255, "Máximo 255 caracteres"),
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
  postalCode: z.string().max(20, "Máximo 20 caracteres"),
  country: z.string().max(2, "Use o código ISO de 2 letras"),
})

export type CustomerUpdateFormValues = z.infer<typeof customerUpdateSchema>
