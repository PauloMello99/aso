import { z } from "zod"

export const anamnesisQuestionSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(["text", "yes_no"]),
  label: z.string().min(1, "Informe o texto da pergunta").max(300),
  required: z.boolean(),
})

export const anamnesisFormSchema = z.object({
  questions: z
    .array(anamnesisQuestionSchema)
    .min(1, "Adicione ao menos uma pergunta")
    .max(50, "No máximo 50 perguntas"),
})

export type AnamnesisQuestionFormValues = z.infer<
  typeof anamnesisQuestionSchema
>
export type AnamnesisFormValues = z.infer<typeof anamnesisFormSchema>
