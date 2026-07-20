import { describe, expect, it } from "vitest"
import { anamnesisFormSchema } from "./anamnesis.schemas"

const VALID_QUESTION = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  type: "text" as const,
  label: "Você tem alergias?",
  required: true,
}

describe("anamnesisFormSchema", () => {
  it("rejeita array de perguntas vazio", () => {
    const result = anamnesisFormSchema.safeParse({ questions: [] })
    expect(result.success).toBe(false)
  })

  it("rejeita pergunta com label vazio", () => {
    const result = anamnesisFormSchema.safeParse({
      questions: [{ ...VALID_QUESTION, label: "" }],
    })
    expect(result.success).toBe(false)
  })

  it("rejeita pergunta com type inválido", () => {
    const result = anamnesisFormSchema.safeParse({
      questions: [{ ...VALID_QUESTION, type: "multiple_choice" }],
    })
    expect(result.success).toBe(false)
  })

  it("aceita payload válido", () => {
    const result = anamnesisFormSchema.safeParse({
      questions: [
        VALID_QUESTION,
        {
          id: "550e8400-e29b-41d4-a716-446655440001",
          type: "yes_no",
          label: "Já fez tatuagem antes?",
          required: false,
        },
      ],
    })
    expect(result.success).toBe(true)
  })
})
