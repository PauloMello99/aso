import { describe, expect, it } from "vitest"
import { ApiError } from "@/infrastructure/api/client"
import {
  campaignErrorMessage,
  campaignImageErrorMessage,
  campaignListErrorMessage,
} from "./error-messages"

describe("campaignErrorMessage", () => {
  it("maps CAMPAIGN_TRIGGER_ALREADY_USED to a curated message", () => {
    const err = new ApiError(
      "raw",
      409,
      "/orgs/1/campaigns",
      "CAMPAIGN_TRIGGER_ALREADY_USED",
    )
    expect(campaignErrorMessage(err)).toBe(
      "Você já tem uma campanha para este gatilho. Edite a campanha existente.",
    )
  })

  it("preserves err.message for SUBSCRIPTION_REQUIRED", () => {
    const err = new ApiError(
      "pt-BR já traduzido",
      402,
      "/x",
      "SUBSCRIPTION_REQUIRED",
    )
    expect(campaignErrorMessage(err)).toBe("pt-BR já traduzido")
  })

  it("falls back to the generic save message for an unmapped code", () => {
    const err = new ApiError("raw", 500, "/x", "SOME_UNMAPPED_CODE")
    expect(campaignErrorMessage(err)).toBe(
      "Não foi possível salvar a campanha.",
    )
  })
})

describe("campaignListErrorMessage", () => {
  it("returns the pt-BR load fallback for a non-ApiError value", () => {
    expect(campaignListErrorMessage(new Error("boom"))).toBe(
      "Não foi possível carregar as campanhas.",
    )
  })

  it("returns the pt-BR load fallback for an unmapped-code ApiError", () => {
    const err = new ApiError("raw", 500, "/orgs/1/campaigns", "SOME_UNMAPPED")
    expect(campaignListErrorMessage(err)).toBe(
      "Não foi possível carregar as campanhas.",
    )
  })

  it("maps a curated code (CAMPAIGN_SETTINGS_FORBIDDEN)", () => {
    const err = new ApiError(
      "raw",
      403,
      "/orgs/1/campaigns",
      "CAMPAIGN_SETTINGS_FORBIDDEN",
    )
    expect(campaignListErrorMessage(err)).toBe(
      "Você não tem permissão para configurar campanhas.",
    )
  })

  it("preserves err.message for SUBSCRIPTION_REQUIRED", () => {
    const err = new ApiError(
      "pt-BR já traduzido",
      402,
      "/orgs/1/campaigns",
      "SUBSCRIPTION_REQUIRED",
    )
    expect(campaignListErrorMessage(err)).toBe("pt-BR já traduzido")
  })
})

describe("campaignImageErrorMessage", () => {
  it("maps a ParseFilePipe size failure (400, no code, 'expected size')", () => {
    const err = new ApiError(
      "Validation failed (expected size is less than 2097152)",
      400,
      "/orgs/1/campaigns/images",
    )
    expect(campaignImageErrorMessage(err)).toBe(
      "Imagem muito grande. Máx. 2 MB.",
    )
  })

  it("maps a canonical 413 to the too-large message", () => {
    const err = new ApiError("raw", 413, "/orgs/1/campaigns/images")
    expect(campaignImageErrorMessage(err)).toBe(
      "Imagem muito grande. Máx. 2 MB.",
    )
  })

  it("maps a ParseFilePipe mime failure (400, no code, 'expected type')", () => {
    const err = new ApiError(
      "Validation failed (expected type is /^image\\/(png|jpeg|webp|gif)$/)",
      400,
      "/orgs/1/campaigns/images",
    )
    expect(campaignImageErrorMessage(err)).toBe(
      "Formato não suportado. Use PNG, JPG, WEBP ou GIF.",
    )
  })

  it("maps the use-case 415 CAMPAIGN_IMAGE_UNSUPPORTED_TYPE", () => {
    const err = new ApiError(
      "raw",
      415,
      "/orgs/1/campaigns/images",
      "CAMPAIGN_IMAGE_UNSUPPORTED_TYPE",
    )
    expect(campaignImageErrorMessage(err)).toBe(
      "Formato não suportado. Use PNG, JPG, WEBP ou GIF.",
    )
  })

  it("falls back to the generic image message for other ApiErrors", () => {
    const err = new ApiError("raw", 500, "/orgs/1/campaigns/images")
    expect(campaignImageErrorMessage(err)).toBe(
      "Não foi possível enviar a imagem. Tente de novo.",
    )
  })

  it("falls back to the generic image message for a non-ApiError value", () => {
    expect(campaignImageErrorMessage(new Error("boom"))).toBe(
      "Não foi possível enviar a imagem. Tente de novo.",
    )
  })
})
