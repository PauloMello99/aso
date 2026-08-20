import { z } from "zod"
import { isValidPhoneNumber } from "libphonenumber-js/max"
import type { AnamnesisQuestion } from "@/features/anamnesis"

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const GENDERS = ["male", "female", "other"] as const

const registrationAnswerFieldSchema = z.object({
  questionId: z.string(),
  value: z.union([z.string(), z.boolean()]).optional(),
})

/**
 * Um único ZodObject cobrindo os campos cadastrais (passo 1) e a anamnese
 * (passo 2) — feito de propósito em vez de reaproveitar/estender
 * `buildAnamnesisAnswersSchema` (que já termina em `.superRefine`, tornando
 * o encadeamento de mais validações menos previsível). Isso mantém um único
 * `z.infer` e paths de campo estáveis pro `useForm` combinado.
 */
export function buildCustomerRegistrationSchema(questions: AnamnesisQuestion[]) {
  return z
    .object({
      name: z
        .string()
        .min(1, "Nome é obrigatório")
        .max(120, "Máximo 120 caracteres"),
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
      answers: z.array(registrationAnswerFieldSchema).length(questions.length),
      signerFullName: z
        .string()
        .trim()
        .min(3, "Informe o nome completo")
        .refine(
          (name) => name.trim().split(/\s+/).length >= 2,
          "Informe nome e sobrenome",
        ),
      signerCpf: z
        .string()
        .optional()
        .refine((cpf) => {
          if (!cpf) return true
          const digits = cpf.replace(/\D/g, "")
          return digits.length === 0 || digits.length === 11
        }, "CPF inválido"),
      signatureImageBase64: z
        .string()
        .refine(
          (value) => value.startsWith("data:image/png;base64,"),
          "Assinatura inválida",
        ),
      consentAccepted: z.boolean(),
    })
    .superRefine((data, ctx) => {
      if (!data.consentAccepted) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["consentAccepted"],
          message: "É necessário concordar com o termo de consentimento acima.",
        })
      }
      questions.forEach((question, index) => {
        if (!question.required) return
        const value = data.answers[index]?.value
        const missing =
          question.type === "text"
            ? typeof value !== "string" || value.trim().length === 0
            : typeof value !== "boolean"
        if (missing) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["answers", index, "value"],
            message: "Campo obrigatório",
          })
        }
      })
    })
}

export type CustomerRegistrationFormValues = z.infer<
  ReturnType<typeof buildCustomerRegistrationSchema>
>

export const REGISTRATION_STEP_1_FIELDS = [
  "name",
  "phone",
  "gender",
  "birthDate",
  "address",
  "addressLine2",
  "number",
  "city",
  "state",
  "postalCode",
  "country",
] as const satisfies readonly (keyof CustomerRegistrationFormValues)[]
