import { describe, expect, it } from "vitest"
import {
  getConfirmationBadge,
  getConfirmationStatusText,
} from "./confirmation-status"

describe("getConfirmationBadge", () => {
  it("retorna null para indisponibilidade", () => {
    expect(
      getConfirmationBadge({
        type: "unavailability",
        confirmationStatus: "pending",
        confirmationSentAt: "2026-10-08T10:00:00Z",
      }),
    ).toBeNull()
  })

  it("retorna null quando não há ciclo de confirmação", () => {
    expect(
      getConfirmationBadge({
        type: "appointment",
        confirmationStatus: null,
        confirmationSentAt: null,
      }),
    ).toBeNull()
  })

  it("pending sem envio => Não enviado", () => {
    expect(
      getConfirmationBadge({
        type: "appointment",
        confirmationStatus: "pending",
        confirmationSentAt: null,
      }),
    ).toEqual({ label: "Não enviado", tone: "neutral" })
  })

  it("pending com envio => Aguardando", () => {
    expect(
      getConfirmationBadge({
        type: "appointment",
        confirmationStatus: "pending",
        confirmationSentAt: "2026-10-08T10:00:00Z",
      }),
    ).toEqual({ label: "Aguardando", tone: "warning" })
  })

  it("confirmed => Confirmado", () => {
    expect(
      getConfirmationBadge({
        type: "appointment",
        confirmationStatus: "confirmed",
        confirmationSentAt: "2026-10-08T10:00:00Z",
      }),
    ).toEqual({ label: "Confirmado", tone: "success" })
  })

  it("canceled_by_customer => Cliente não vai", () => {
    expect(
      getConfirmationBadge({
        type: "appointment",
        confirmationStatus: "canceled_by_customer",
        confirmationSentAt: "2026-10-08T10:00:00Z",
      }),
    ).toEqual({ label: "Cliente não vai", tone: "danger" })
  })
})

describe("getConfirmationStatusText", () => {
  const base = { type: "appointment" as const, confirmationSentAt: null }

  it("retorna null sem ciclo ou para indisponibilidade", () => {
    expect(
      getConfirmationStatusText({ ...base, confirmationStatus: null }),
    ).toBeNull()
    expect(
      getConfirmationStatusText({
        type: "unavailability",
        confirmationStatus: "confirmed",
        confirmationSentAt: null,
      }),
    ).toBeNull()
  })

  it("cobre todos os estados", () => {
    expect(
      getConfirmationStatusText({ ...base, confirmationStatus: "pending" }),
    ).toBe("Confirmação não enviada")
    expect(
      getConfirmationStatusText({
        ...base,
        confirmationStatus: "pending",
        confirmationSentAt: "2026-10-08T10:00:00Z",
      }),
    ).toBe("Aguardando confirmação")
    expect(
      getConfirmationStatusText({ ...base, confirmationStatus: "confirmed" }),
    ).toBe("Confirmado pelo cliente")
    expect(
      getConfirmationStatusText({
        ...base,
        confirmationStatus: "canceled_by_customer",
      }),
    ).toBe("Cliente avisou que não poderá ir")
  })
})
