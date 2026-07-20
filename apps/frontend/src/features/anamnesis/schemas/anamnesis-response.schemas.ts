import { z } from "zod"
import type { AnamnesisQuestion } from "../types"

const anamnesisAnswerFieldSchema = z.object({
  questionId: z.string(),
  value: z.union([z.string(), z.boolean()]).optional(),
})

export function buildAnamnesisAnswersSchema(questions: AnamnesisQuestion[]) {
  return z
    .object({
      answers: z.array(anamnesisAnswerFieldSchema).length(questions.length),
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
    })
    .superRefine((data, ctx) => {
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

export type AnamnesisAnswersFormValues = z.infer<
  ReturnType<typeof buildAnamnesisAnswersSchema>
>
