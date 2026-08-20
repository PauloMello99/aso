import { describe, expect, it } from "vitest"
import { buildCustomerRegistrationSchema } from "./customer-registration.schemas"
import type { AnamnesisQuestion } from "@/features/anamnesis"

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

const VALID_BASE = {
  name: "Maria Silva",
  phone: "",
  gender: "",
  birthDate: "1990-01-01",
  address: "Rua A",
  addressLine2: "",
  number: "123",
  city: "São Paulo",
  state: "SP",
  postalCode: "",
  country: "",
  signerFullName: VALID_SIGNER_NAME,
  signerCpf: "",
  signatureImageBase64: VALID_SIGNATURE,
  consentAccepted: true,
}

describe("buildCustomerRegistrationSchema", () => {
  describe("obrigatoriedade por tipo de pergunta", () => {
    it("rejeita pergunta de texto obrigatória vazia", () => {
      const schema = buildCustomerRegistrationSchema([TEXT_REQUIRED])
      const result = schema.safeParse({
        ...VALID_BASE,
        answers: [{ questionId: "q1", value: "" }],
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(
          result.error.issues.some(
            (issue) => issue.path.join(".") === "answers.0.value",
          ),
        ).toBe(true)
      }
    })

    it("rejeita pergunta sim/não obrigatória sem valor booleano", () => {
      const schema = buildCustomerRegistrationSchema([YES_NO_REQUIRED])
      const result = schema.safeParse({
        ...VALID_BASE,
        answers: [{ questionId: "q2", value: undefined }],
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(
          result.error.issues.some(
            (issue) => issue.path.join(".") === "answers.0.value",
          ),
        ).toBe(true)
      }
    })

    it("aceita pergunta opcional sem valor", () => {
      const schema = buildCustomerRegistrationSchema([TEXT_OPTIONAL])
      const result = schema.safeParse({
        ...VALID_BASE,
        answers: [{ questionId: "q3", value: undefined }],
      })
      expect(result.success).toBe(true)
    })
  })

  describe("signerCpf", () => {
    it("aceita CPF vazio", () => {
      const schema = buildCustomerRegistrationSchema([])
      const result = schema.safeParse({
        ...VALID_BASE,
        answers: [],
        signerCpf: "",
      })
      expect(result.success).toBe(true)
    })

    it("rejeita CPF com 3 dígitos", () => {
      const schema = buildCustomerRegistrationSchema([])
      const result = schema.safeParse({
        ...VALID_BASE,
        answers: [],
        signerCpf: "123",
      })
      expect(result.success).toBe(false)
    })

    it("aceita CPF com 11 dígitos", () => {
      const schema = buildCustomerRegistrationSchema([])
      const result = schema.safeParse({
        ...VALID_BASE,
        answers: [],
        signerCpf: "12345678901",
      })
      expect(result.success).toBe(true)
    })
  })

  describe("signatureImageBase64", () => {
    it("rejeita assinatura sem o prefixo data:image/png;base64,", () => {
      const schema = buildCustomerRegistrationSchema([])
      const result = schema.safeParse({
        ...VALID_BASE,
        answers: [],
        signatureImageBase64: "data:image/jpeg;base64,iVBORw0KGgo=",
      })
      expect(result.success).toBe(false)
    })

    it("aceita assinatura com o prefixo correto", () => {
      const schema = buildCustomerRegistrationSchema([])
      const result = schema.safeParse({
        ...VALID_BASE,
        answers: [],
        signatureImageBase64: VALID_SIGNATURE,
      })
      expect(result.success).toBe(true)
    })
  })

  describe("consentAccepted", () => {
    it("rejeita quando o consentimento não foi aceito", () => {
      const schema = buildCustomerRegistrationSchema([])
      const result = schema.safeParse({
        ...VALID_BASE,
        answers: [],
        consentAccepted: false,
      })
      expect(result.success).toBe(false)
    })
  })
})
