import { describe, expect, it } from "vitest"
import { ApiError } from "@/infrastructure/api/client"
import { serviceErrorMessage } from "./error-messages"

describe("serviceErrorMessage", () => {
  it("maps SERVICE_AGE_VERIFICATION_REQUIRED to a curated destructive message", () => {
    const err = new ApiError(
      "raw backend text",
      422,
      "/orgs/1/services",
      "SERVICE_AGE_VERIFICATION_REQUIRED",
    )
    const result = serviceErrorMessage(err)
    expect(result.variant).toBe("destructive")
    expect(result.title).toBe("Serviço restrito a maiores de 18 anos")
    expect(result.description).not.toBe("raw backend text")
  })

  it("maps SERVICE_MATERIAL_REQUIRED to a curated message", () => {
    const err = new ApiError(
      "raw",
      422,
      "/orgs/1/services",
      "SERVICE_MATERIAL_REQUIRED",
    )
    expect(serviceErrorMessage(err).title).toBe("Material obrigatório")
  })

  it("maps SERVICE_PERFORMED_AT_FUTURE to a curated message", () => {
    const err = new ApiError(
      "raw",
      422,
      "/orgs/1/services",
      "SERVICE_PERFORMED_AT_FUTURE",
    )
    expect(serviceErrorMessage(err).title).toBe("Data de execução inválida")
  })

  it("maps SERVICE_TYPE_NOT_FOUND to a curated message", () => {
    const err = new ApiError(
      "raw",
      404,
      "/orgs/1/services",
      "SERVICE_TYPE_NOT_FOUND",
    )
    expect(serviceErrorMessage(err).title).toBe(
      "Tipo de serviço não encontrado",
    )
  })

  it("maps CUSTOMER_DISABLED to a curated message", () => {
    const err = new ApiError(
      "raw",
      422,
      "/orgs/1/services",
      "CUSTOMER_DISABLED",
    )
    expect(serviceErrorMessage(err).title).toBe("Cliente inativo")
  })

  it("maps EMPLOYEE_INACTIVE to a curated message", () => {
    const err = new ApiError(
      "raw",
      422,
      "/orgs/1/services",
      "EMPLOYEE_INACTIVE",
    )
    expect(serviceErrorMessage(err).title).toBe("Profissional inativo")
  })

  it("maps SERVICE_NOT_FOUND to a curated message", () => {
    const err = new ApiError(
      "raw",
      404,
      "/orgs/1/services/1",
      "SERVICE_NOT_FOUND",
    )
    expect(serviceErrorMessage(err).title).toBe("Serviço não encontrado")
  })

  it("maps SERVICE_FORBIDDEN to a curated message", () => {
    const err = new ApiError(
      "raw",
      403,
      "/orgs/1/services/1",
      "SERVICE_FORBIDDEN",
    )
    expect(serviceErrorMessage(err).title).toBe("Sem permissão")
  })

  it("maps SERVICE_ALREADY_CANCELED to a curated message", () => {
    const err = new ApiError(
      "raw",
      409,
      "/orgs/1/services/1",
      "SERVICE_ALREADY_CANCELED",
    )
    expect(serviceErrorMessage(err).title).toBe("Serviço já cancelado")
  })

  it("regression: preserves err.message for SUBSCRIPTION_REQUIRED (client.ts already translates it to pt-BR)", () => {
    const err = new ApiError(
      "Assinatura necessária. Regularize a assinatura desta organização em Configurações → Assinatura.",
      402,
      "/orgs/1/services",
      "SUBSCRIPTION_REQUIRED",
    )
    const result = serviceErrorMessage(err)
    expect(result.description).toBe(
      "Assinatura necessária. Regularize a assinatura desta organização em Configurações → Assinatura.",
    )
    expect(result.title).not.toBe(
      "Assinatura necessária. Regularize a assinatura desta organização em Configurações → Assinatura.",
    )
  })

  it("preserves err.message for ANY unmapped ApiError code, not just SUBSCRIPTION_REQUIRED", () => {
    const err = new ApiError(
      "some other raw backend text",
      500,
      "/orgs/1/services",
      "SOME_TOTALLY_UNMAPPED_CODE",
    )
    const result = serviceErrorMessage(err)
    expect(result.description).toBe("some other raw backend text")
  })

  it("preserves err.message for an ApiError without a code at all", () => {
    const err = new ApiError("raw text, no code", 500, "/orgs/1/services")
    expect(serviceErrorMessage(err).description).toBe("raw text, no code")
  })

  it("falls back to err.message for a generic Error", () => {
    expect(serviceErrorMessage(new Error("boom")).description).toBe("boom")
  })

  it("falls back to a generic description for a non-Error value", () => {
    const result = serviceErrorMessage("boom")
    expect(result.title).toBe("Não foi possível lançar o serviço")
    expect(result.description).toBe("Falha ao lançar o serviço.")
  })
})
