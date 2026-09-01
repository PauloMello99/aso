import { describe, expect, it } from "vitest"
import { campaignSettingsSchema } from "./campaign-settings.schema"

const VALID_VALUES = {
  postServiceEnabled: true,
  birthdayEnabled: false,
  inactivityEnabled: true,
  inactivityMonths: 6,
  postServiceSubject: "Obrigado pela visita",
  postServiceBody: "Olá {{customerName}}",
  birthdaySubject: "",
  birthdayBody: "",
  inactivitySubject: "",
  inactivityBody: "",
}

describe("campaignSettingsSchema", () => {
  it("aceita o payload válido completo", () => {
    const result = campaignSettingsSchema.safeParse(VALID_VALUES)
    expect(result.success).toBe(true)
  })

  it("aceita textos em branco (segue o padrão do produto)", () => {
    const result = campaignSettingsSchema.safeParse({
      ...VALID_VALUES,
      postServiceSubject: "",
      postServiceBody: "",
    })
    expect(result.success).toBe(true)
  })

  it("rejeita assunto com 201 caracteres", () => {
    const result = campaignSettingsSchema.safeParse({
      ...VALID_VALUES,
      postServiceSubject: "a".repeat(201),
    })
    expect(result.success).toBe(false)
  })

  it("aceita assunto com exatamente 200 caracteres", () => {
    const result = campaignSettingsSchema.safeParse({
      ...VALID_VALUES,
      postServiceSubject: "a".repeat(200),
    })
    expect(result.success).toBe(true)
  })

  it("rejeita corpo com 5001 caracteres", () => {
    const result = campaignSettingsSchema.safeParse({
      ...VALID_VALUES,
      inactivityBody: "a".repeat(5001),
    })
    expect(result.success).toBe(false)
  })

  it("aceita corpo com exatamente 5000 caracteres", () => {
    const result = campaignSettingsSchema.safeParse({
      ...VALID_VALUES,
      inactivityBody: "a".repeat(5000),
    })
    expect(result.success).toBe(true)
  })

  it("rejeita inactivityMonths igual a 0", () => {
    const result = campaignSettingsSchema.safeParse({
      ...VALID_VALUES,
      inactivityMonths: 0,
    })
    expect(result.success).toBe(false)
  })

  it("rejeita inactivityMonths igual a 37", () => {
    const result = campaignSettingsSchema.safeParse({
      ...VALID_VALUES,
      inactivityMonths: 37,
    })
    expect(result.success).toBe(false)
  })

  it("aceita inactivityMonths igual a 6", () => {
    const result = campaignSettingsSchema.safeParse({
      ...VALID_VALUES,
      inactivityMonths: 6,
    })
    expect(result.success).toBe(true)
  })
})
