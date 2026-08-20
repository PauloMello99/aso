import { describe, expect, it } from "vitest"
import { resolvePublicLookupErrorState } from "./public-lookup-state"
import { ApiError } from "@/infrastructure/api/client"

const CODES = {
  expired: "REGISTRATION_LINK_EXPIRED",
  alreadySubmitted: "REGISTRATION_ALREADY_SUBMITTED",
}

describe("resolvePublicLookupErrorState", () => {
  it("retorna 'expired' quando o code é o de link expirado", () => {
    const error = new ApiError("expirado", 410, "/x", CODES.expired)
    expect(resolvePublicLookupErrorState(error, CODES)).toBe("expired")
  })

  it("retorna 'already_submitted' quando o code é o de já enviado", () => {
    const error = new ApiError("já enviado", 409, "/x", CODES.alreadySubmitted)
    expect(resolvePublicLookupErrorState(error, CODES)).toBe(
      "already_submitted",
    )
  })

  it("retorna 'invalid' para um code de ApiError desconhecido", () => {
    const error = new ApiError("não encontrado", 404, "/x", "NOT_FOUND")
    expect(resolvePublicLookupErrorState(error, CODES)).toBe("invalid")
  })

  it("retorna 'invalid' para erro que não é ApiError (falha de rede)", () => {
    const error = new Error("network error")
    expect(resolvePublicLookupErrorState(error, CODES)).toBe("invalid")
  })
})
