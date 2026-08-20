import { describe, expect, it } from "vitest"
import { ApiError } from "@/infrastructure/api/client"
import { sendCustomerUpdateInviteErrorMessage } from "./use-send-customer-update-invite"

describe("sendCustomerUpdateInviteErrorMessage", () => {
  it("maps CUSTOMER_NOT_FOUND to a curated message", () => {
    const err = new ApiError(
      "raw",
      404,
      "/orgs/1/customers/1/update-invites",
      "CUSTOMER_NOT_FOUND",
    )
    expect(sendCustomerUpdateInviteErrorMessage(err)).toBe(
      "Cliente não encontrado.",
    )
  })

  it("maps CUSTOMER_UPDATE_INVITATION_INVITE_EMAIL_FAILED to a curated message", () => {
    const err = new ApiError(
      "raw",
      502,
      "/orgs/1/customers/1/update-invites",
      "CUSTOMER_UPDATE_INVITATION_INVITE_EMAIL_FAILED",
    )
    expect(sendCustomerUpdateInviteErrorMessage(err)).toContain(
      "Não foi possível enviar o e-mail",
    )
  })

  it("preserves err.message for SUBSCRIPTION_REQUIRED (client.ts already translates it to pt-BR)", () => {
    const err = new ApiError(
      "Assinatura necessária. Regularize a assinatura desta organização em Configurações → Assinatura.",
      402,
      "/orgs/1/customers/1/update-invites",
      "SUBSCRIPTION_REQUIRED",
    )
    expect(sendCustomerUpdateInviteErrorMessage(err)).toBe(err.message)
  })

  it("falls back to a default message for an unmapped code", () => {
    const err = new ApiError(
      "raw",
      500,
      "/orgs/1/customers/1/update-invites",
      "SOME_TOTALLY_UNMAPPED_CODE",
    )
    expect(sendCustomerUpdateInviteErrorMessage(err)).toBe(
      "Não foi possível enviar o convite de atualização cadastral. Tente novamente.",
    )
  })

  it("falls back to a default message for a non-ApiError value", () => {
    expect(sendCustomerUpdateInviteErrorMessage(new Error("boom"))).toBe(
      "Não foi possível enviar o convite de atualização cadastral. Tente novamente.",
    )
  })
})
