import { describe, expect, it } from "vitest"
import { ApiError } from "@/infrastructure/api/client"
import { sendAnamnesisInviteErrorMessage } from "./use-send-anamnesis-invite"

describe("sendAnamnesisInviteErrorMessage", () => {
  it("maps ANAMNESIS_FORM_NOT_CONFIGURED to a curated message", () => {
    const err = new ApiError(
      "raw",
      422,
      "/orgs/1/anamnesis-responses",
      "ANAMNESIS_FORM_NOT_CONFIGURED",
    )
    expect(sendAnamnesisInviteErrorMessage(err)).toContain(
      "não tem ficha de anamnese configurada",
    )
  })

  it("maps ANAMNESIS_INVITE_EMAIL_FAILED to a curated message", () => {
    const err = new ApiError(
      "raw",
      422,
      "/orgs/1/anamnesis-responses",
      "ANAMNESIS_INVITE_EMAIL_FAILED",
    )
    expect(sendAnamnesisInviteErrorMessage(err)).toContain(
      "Não foi possível enviar o e-mail",
    )
  })

  it("maps ANAMNESIS_ALREADY_ANSWERED_CURRENT_VERSION to a curated message", () => {
    const err = new ApiError(
      "raw",
      422,
      "/orgs/1/anamnesis-responses",
      "ANAMNESIS_ALREADY_ANSWERED_CURRENT_VERSION",
    )
    expect(sendAnamnesisInviteErrorMessage(err)).toContain("já respondeu")
  })

  it("preserves err.message for SUBSCRIPTION_REQUIRED (client.ts already translates it to pt-BR)", () => {
    const err = new ApiError(
      "Assinatura necessária. Regularize a assinatura desta organização em Configurações → Assinatura.",
      402,
      "/orgs/1/anamnesis-responses",
      "SUBSCRIPTION_REQUIRED",
    )
    expect(sendAnamnesisInviteErrorMessage(err)).toBe(err.message)
  })

  it("falls back to a default message for an unmapped code", () => {
    const err = new ApiError(
      "raw",
      500,
      "/orgs/1/anamnesis-responses",
      "SOME_TOTALLY_UNMAPPED_CODE",
    )
    expect(sendAnamnesisInviteErrorMessage(err)).toBe(
      "Não foi possível enviar a ficha de anamnese. Tente novamente.",
    )
  })

  it("falls back to a default message for a non-ApiError value", () => {
    expect(sendAnamnesisInviteErrorMessage(new Error("boom"))).toBe(
      "Não foi possível enviar a ficha de anamnese. Tente novamente.",
    )
  })
})
