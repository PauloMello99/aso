import { describe, expect, it } from "vitest"
import { ApiError } from "@/infrastructure/api/client"
import { sendAnamnesisCopyErrorMessage } from "./use-send-anamnesis-response-copy"

describe("sendAnamnesisCopyErrorMessage", () => {
  it("maps ANAMNESIS_RESPONSE_NOT_SUBMITTED to a curated message", () => {
    const err = new ApiError(
      "raw",
      422,
      "/orgs/1/anamnesis-responses/1/send-copy",
      "ANAMNESIS_RESPONSE_NOT_SUBMITTED",
    )
    expect(sendAnamnesisCopyErrorMessage(err)).toContain("ainda não foi respondida")
  })

  it("maps ANAMNESIS_DOCUMENT_UNAVAILABLE to a curated message", () => {
    const err = new ApiError(
      "raw",
      422,
      "/orgs/1/anamnesis-responses/1/send-copy",
      "ANAMNESIS_DOCUMENT_UNAVAILABLE",
    )
    expect(sendAnamnesisCopyErrorMessage(err)).toContain("documento assinado")
  })

  it("maps ANAMNESIS_DOCUMENT_FETCH_FAILED to a curated message distinct from UNAVAILABLE", () => {
    const err = new ApiError(
      "raw",
      502,
      "/orgs/1/anamnesis-responses/1/send-copy",
      "ANAMNESIS_DOCUMENT_FETCH_FAILED",
    )
    const message = sendAnamnesisCopyErrorMessage(err)
    expect(message).toContain("Não foi possível acessar o PDF")
    expect(message).not.toContain("documento assinado")
  })

  it("maps ANAMNESIS_RESPONSE_NO_RECIPIENT to a curated message", () => {
    const err = new ApiError(
      "raw",
      422,
      "/orgs/1/anamnesis-responses/1/send-copy",
      "ANAMNESIS_RESPONSE_NO_RECIPIENT",
    )
    expect(sendAnamnesisCopyErrorMessage(err)).toContain("não tem um e-mail cadastrado")
  })

  it("maps ANAMNESIS_INVITE_EMAIL_FAILED to a curated message", () => {
    const err = new ApiError(
      "raw",
      422,
      "/orgs/1/anamnesis-responses/1/send-copy",
      "ANAMNESIS_INVITE_EMAIL_FAILED",
    )
    expect(sendAnamnesisCopyErrorMessage(err)).toContain(
      "Não foi possível enviar o e-mail",
    )
  })

  it("preserves err.message for SUBSCRIPTION_REQUIRED (client.ts already translates it to pt-BR)", () => {
    const err = new ApiError(
      "Assinatura necessária. Regularize a assinatura desta organização em Configurações → Assinatura.",
      402,
      "/orgs/1/anamnesis-responses/1/send-copy",
      "SUBSCRIPTION_REQUIRED",
    )
    expect(sendAnamnesisCopyErrorMessage(err)).toBe(err.message)
  })

  it("falls back to a default message for an unmapped code", () => {
    const err = new ApiError(
      "raw",
      500,
      "/orgs/1/anamnesis-responses/1/send-copy",
      "SOME_TOTALLY_UNMAPPED_CODE",
    )
    expect(sendAnamnesisCopyErrorMessage(err)).toBe(
      "Não foi possível enviar a ficha por e-mail. Tente novamente.",
    )
  })

  it("falls back to a default message for a non-ApiError value", () => {
    expect(sendAnamnesisCopyErrorMessage(new Error("boom"))).toBe(
      "Não foi possível enviar a ficha por e-mail. Tente novamente.",
    )
  })
})
