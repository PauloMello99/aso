import { describe, expect, it } from "vitest"
import {
  CANCELED_BY_STUDIO_MESSAGE,
  formatConfirmationDateTime,
  getConfirmationErrorMessage,
  getConfirmationSuccessMessage,
} from "./appointment-confirmation-public"

describe("getConfirmationErrorMessage", () => {
  it("mapeia status conhecidos", () => {
    expect(getConfirmationErrorMessage(404)).toContain("Link inválido")
    expect(getConfirmationErrorMessage(410)).toBe("Este link expirou.")
    expect(getConfirmationErrorMessage(409)).toBe(CANCELED_BY_STUDIO_MESSAGE)
    expect(getConfirmationErrorMessage(429)).toContain("Muitas tentativas")
  })

  it("usa mensagem genérica para o restante", () => {
    expect(getConfirmationErrorMessage(500)).toContain("Não foi possível")
    expect(getConfirmationErrorMessage(undefined)).toContain("Não foi possível")
  })
})

describe("getConfirmationSuccessMessage", () => {
  it("retorna mensagem por resposta", () => {
    expect(getConfirmationSuccessMessage("confirmed")).toBe(
      "Presença confirmada. Obrigado!",
    )
    expect(getConfirmationSuccessMessage("canceled_by_customer")).toBe(
      "Registramos que você não poderá ir.",
    )
    expect(getConfirmationSuccessMessage("pending")).toBeNull()
  })
})

describe("formatConfirmationDateTime", () => {
  it("formata no fuso de São Paulo", () => {
    const out = formatConfirmationDateTime(
      "2026-10-10T17:00:00.000Z",
      "2026-10-10T18:30:00.000Z",
      false,
    )
    expect(out).toContain("10 de outubro de 2026")
    expect(out).toContain("14:00 às 15:30")
  })

  it("dia inteiro mostra só a data", () => {
    const out = formatConfirmationDateTime(
      "2026-10-10T15:00:00.000Z",
      "2026-10-11T02:59:00.000Z",
      true,
    )
    expect(out).toContain("10 de outubro de 2026")
    expect(out).not.toContain(":")
  })
})
