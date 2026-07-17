import { z } from "zod"
import type { AnamnesisQuestion } from "../types"

const anamnesisAnswerFieldSchema = z.object({
  questionId: z.string(),
  value: z.union([z.string(), z.boolean()]).optional(),
})

/**
 * Schema dinâmico, dependente das perguntas carregadas do backend: cada
 * pergunta `required: true` precisa de um valor preenchido — texto não
 * vazio para `text`, `true`/`false` explícito para `yes_no`. `answers` deve
 * estar na mesma ordem/tamanho de `questions` (defaultValues do formulário).
 */
export function buildAnamnesisAnswersSchema(questions: AnamnesisQuestion[]) {
  return z
    .object({
      answers: z.array(anamnesisAnswerFieldSchema).length(questions.length),
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
