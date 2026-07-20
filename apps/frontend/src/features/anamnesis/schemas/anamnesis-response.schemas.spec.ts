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

const VALID_SIGNATURE = "data:image/png;base64,iVBORw0KGgo="
const VALID_SIGNER_NAME = "Maria Silva"

describe("buildAnamnesisAnswersSchema", () => {
  it("rejeita pergunta de texto obrigatória sem valor", () => {
    const schema = buildAnamnesisAnswersSchema([TEXT_REQUIRED])
    const result = schema.safeParse({
      answers: [{ questionId: "q1", value: undefined }],
      signerFullName: VALID_SIGNER_NAME,
      signatureImageBase64: VALID_SIGNATURE,
    })
    expect(result.success).toBe(false)
  })

  it("rejeita pergunta de texto obrigatória com valor em branco", () => {
    const schema = buildAnamnesisAnswersSchema([TEXT_REQUIRED])
    const result = schema.safeParse({
      answers: [{ questionId: "q1", value: "   " }],
      signerFullName: VALID_SIGNER_NAME,
      signatureImageBase64: VALID_SIGNATURE,
    })
    expect(result.success).toBe(false)
  })

  it("rejeita pergunta sim/não obrigatória sem valor booleano", () => {
    const schema = buildAnamnesisAnswersSchema([YES_NO_REQUIRED])
    const result = schema.safeParse({
      answers: [{ questionId: "q2", value: undefined }],
      signerFullName: VALID_SIGNER_NAME,
      signatureImageBase64: VALID_SIGNATURE,
    })
    expect(result.success).toBe(false)
  })

  it("aceita pergunta opcional sem valor", () => {
    const schema = buildAnamnesisAnswersSchema([TEXT_OPTIONAL])
    const result = schema.safeParse({
      answers: [{ questionId: "q3", value: undefined }],
      signerFullName: VALID_SIGNER_NAME,
      signatureImageBase64: VALID_SIGNATURE,
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
      signerFullName: VALID_SIGNER_NAME,
      signatureImageBase64: VALID_SIGNATURE,
    })
    expect(result.success).toBe(true)
  })

  it("rejeita signerFullName com uma só palavra", () => {
    const schema = buildAnamnesisAnswersSchema([TEXT_OPTIONAL])
    const result = schema.safeParse({
      answers: [{ questionId: "q3", value: undefined }],
      signerFullName: "Maria",
      signatureImageBase64: VALID_SIGNATURE,
    })
    expect(result.success).toBe(false)
  })

  it("rejeita signerCpf com 10 dígitos", () => {
    const schema = buildAnamnesisAnswersSchema([TEXT_OPTIONAL])
    const result = schema.safeParse({
      answers: [{ questionId: "q3", value: undefined }],
      signerFullName: VALID_SIGNER_NAME,
      signerCpf: "1234567890",
      signatureImageBase64: VALID_SIGNATURE,
    })
    expect(result.success).toBe(false)
  })

  it("aceita signerCpf vazio ou omitido", () => {
    const schema = buildAnamnesisAnswersSchema([TEXT_OPTIONAL])

    const withEmptyString = schema.safeParse({
      answers: [{ questionId: "q3", value: undefined }],
      signerFullName: VALID_SIGNER_NAME,
      signerCpf: "",
      signatureImageBase64: VALID_SIGNATURE,
    })
    expect(withEmptyString.success).toBe(true)

    const withOmitted = schema.safeParse({
      answers: [{ questionId: "q3", value: undefined }],
      signerFullName: VALID_SIGNER_NAME,
      signatureImageBase64: VALID_SIGNATURE,
    })
    expect(withOmitted.success).toBe(true)
  })

  it("rejeita signatureImageBase64 sem o prefixo data:image/png", () => {
    const schema = buildAnamnesisAnswersSchema([TEXT_OPTIONAL])
    const result = schema.safeParse({
      answers: [{ questionId: "q3", value: undefined }],
      signerFullName: VALID_SIGNER_NAME,
      signatureImageBase64: "data:image/jpeg;base64,iVBORw0KGgo=",
    })
    expect(result.success).toBe(false)
  })
})
