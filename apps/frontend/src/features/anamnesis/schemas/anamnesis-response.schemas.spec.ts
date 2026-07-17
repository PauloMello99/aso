import { describe, expect, it } from "vitest"
import { buildAnamnesisAnswersSchema } from "./anamnesis-response.schemas"
import type { AnamnesisQuestion } from "../types"

const TEXT_REQUIRED: AnamnesisQuestion = {
  id: "q1",
  type: "text",
  label: "Você tem alergias?",
  required: true,
}

const YES_NO_REQUIRED: AnamnesisQuestion = {
  id: "q2",
  type: "yes_no",
  label: "Já fez tatuagem antes?",
  required: true,
}

const TEXT_OPTIONAL: AnamnesisQuestion = {
  id: "q3",
  type: "text",
  label: "Observações",
  required: false,
}

describe("buildAnamnesisAnswersSchema", () => {
  it("rejeita pergunta de texto obrigatória sem valor", () => {
    const schema = buildAnamnesisAnswersSchema([TEXT_REQUIRED])
    const result = schema.safeParse({
      answers: [{ questionId: "q1", value: undefined }],
    })
    expect(result.success).toBe(false)
  })

  it("rejeita pergunta de texto obrigatória com valor em branco", () => {
    const schema = buildAnamnesisAnswersSchema([TEXT_REQUIRED])
    const result = schema.safeParse({
      answers: [{ questionId: "q1", value: "   " }],
    })
    expect(result.success).toBe(false)
  })

  it("rejeita pergunta sim/não obrigatória sem valor booleano", () => {
    const schema = buildAnamnesisAnswersSchema([YES_NO_REQUIRED])
    const result = schema.safeParse({
      answers: [{ questionId: "q2", value: undefined }],
    })
    expect(result.success).toBe(false)
  })

  it("aceita pergunta opcional sem valor", () => {
    const schema = buildAnamnesisAnswersSchema([TEXT_OPTIONAL])
    const result = schema.safeParse({
      answers: [{ questionId: "q3", value: undefined }],
    })
    expect(result.success).toBe(true)
  })

  it("aceita payload válido com múltiplas perguntas", () => {
    const schema = buildAnamnesisAnswersSchema([
      TEXT_REQUIRED,
      YES_NO_REQUIRED,
      TEXT_OPTIONAL,
    ])
    const result = schema.safeParse({
      answers: [
        { questionId: "q1", value: "Não tenho" },
        { questionId: "q2", value: false },
        { questionId: "q3", value: undefined },
      ],
    })
    expect(result.success).toBe(true)
  })
})
