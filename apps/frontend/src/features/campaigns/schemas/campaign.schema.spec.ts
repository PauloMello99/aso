import { describe, expect, it } from "vitest"
import {
  campaignBodySchema,
  createCampaignSchema,
  updateCampaignSchema,
} from "./campaign.schema"

describe("createCampaignSchema", () => {
  it("aceita um payload válido de post_service", () => {
    const result = createCampaignSchema.safeParse({
      trigger: "post_service",
      name: "Boas-vindas",
    })
    expect(result.success).toBe(true)
  })

  it("aceita um payload válido de birthday sem inactivityMonths", () => {
    const result = createCampaignSchema.safeParse({
      trigger: "birthday",
      name: "Feliz aniversário",
    })
    expect(result.success).toBe(true)
  })

  it("aceita um payload válido de inactivity com inactivityMonths", () => {
    const result = createCampaignSchema.safeParse({
      trigger: "inactivity",
      name: "Sentimos sua falta",
      inactivityMonths: 6,
    })
    expect(result.success).toBe(true)
  })

  it("rejeita inactivity sem inactivityMonths", () => {
    const result = createCampaignSchema.safeParse({
      trigger: "inactivity",
      name: "Sentimos sua falta",
    })
    expect(result.success).toBe(false)
  })

  it("rejeita name vazio", () => {
    const result = createCampaignSchema.safeParse({
      trigger: "birthday",
      name: "",
    })
    expect(result.success).toBe(false)
  })

  it("rejeita name apenas com espaços", () => {
    const result = createCampaignSchema.safeParse({
      trigger: "birthday",
      name: "   ",
    })
    expect(result.success).toBe(false)
  })

  it("rejeita name acima de 80 caracteres", () => {
    const result = createCampaignSchema.safeParse({
      trigger: "birthday",
      name: "a".repeat(81),
    })
    expect(result.success).toBe(false)
  })
})

describe("updateCampaignSchema", () => {
  it("aceita um patch parcial apenas com enabled", () => {
    const result = updateCampaignSchema.safeParse({ enabled: true })
    expect(result.success).toBe(true)
  })

  it("remove (strip) uma chave trigger extra em vez de rejeitar", () => {
    const parsed = updateCampaignSchema.parse({
      trigger: "post_service",
      name: "Nome novo",
    })
    expect(parsed).toEqual({ name: "Nome novo" })
    expect(parsed).not.toHaveProperty("trigger")
  })

  it("rejeita name apenas com espaços quando presente", () => {
    const result = updateCampaignSchema.safeParse({ name: "   " })
    expect(result.success).toBe(false)
  })
})

describe("campaignBodySchema", () => {
  it("aceita { type: 'doc', content: [] }", () => {
    const result = campaignBodySchema.safeParse({ type: "doc", content: [] })
    expect(result.success).toBe(true)
  })

  it("rejeita { type: 'paragraph' } na raiz", () => {
    const result = campaignBodySchema.safeParse({ type: "paragraph" })
    expect(result.success).toBe(false)
  })
})
