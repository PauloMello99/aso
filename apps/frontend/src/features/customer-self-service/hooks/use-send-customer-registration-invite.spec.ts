import { describe, expect, it } from "vitest"
import { ApiError } from "@/infrastructure/api/client"
import { sendCustomerRegistrationInviteErrorMessage } from "./use-send-customer-registration-invite"

describe("sendCustomerRegistrationInviteErrorMessage", () => {
  it("maps CUSTOMER_EMAIL_ALREADY_EXISTS to a curated message", () => {
    const err = new ApiError(
      "raw",
      409,
      "/orgs/1/registration-invites",
      "CUSTOMER_EMAIL_ALREADY_EXISTS",
    )
    expect(sendCustomerRegistrationInviteErrorMessage(err)).toContain(
      "Já existe um cliente com este e-mail",
    )
  })

  it("maps ANAMNESIS_FORM_NOT_CONFIGURED to a curated message", () => {
    const err = new ApiError(
      "raw",
      422,
      "/orgs/1/registration-invites",
      "ANAMNESIS_FORM_NOT_CONFIGURED",
    )
    expect(sendCustomerRegistrationInviteErrorMessage(err)).toContain(
      "não tem ficha de anamnese configurada",
    )
  })

  it("maps CUSTOMER_SELF_REGISTRATION_INVITE_EMAIL_FAILED to a curated message", () => {
    const err = new ApiError(
      "raw",
      502,
      "/orgs/1/registration-invites",
      "CUSTOMER_SELF_REGISTRATION_INVITE_EMAIL_FAILED",
    )
    expect(sendCustomerRegistrationInviteErrorMessage(err)).toContain(
      "Não foi possível enviar o e-mail",
    )
  })

  it("preserves err.message for SUBSCRIPTION_REQUIRED (client.ts already translates it to pt-BR)", () => {
    const err = new ApiError(
      "Assinatura necessária. Regularize a assinatura desta organização em Configurações → Assinatura.",
      402,
      "/orgs/1/registration-invites",
      "SUBSCRIPTION_REQUIRED",
    )
    expect(sendCustomerRegistrationInviteErrorMessage(err)).toBe(err.message)
  })

  it("falls back to a default message for an unmapped code", () => {
    const err = new ApiError(
      "raw",
      500,
      "/orgs/1/registration-invites",
      "SOME_TOTALLY_UNMAPPED_CODE",
    )
    expect(sendCustomerRegistrationInviteErrorMessage(err)).toBe(
      "Não foi possível enviar o convite de cadastro. Tente novamente.",
    )
  })

  it("falls back to a default message for a non-ApiError value", () => {
    expect(sendCustomerRegistrationInviteErrorMessage(new Error("boom"))).toBe(
      "Não foi possível enviar o convite de cadastro. Tente novamente.",
    )
  })
})
