import { describe, expect, it } from "vitest"
import {
  deliveryReason,
  recipientEmail,
  recipientName,
} from "./delivery-report"

describe("deliveryReason", () => {
  it("sent has no detail nor hint", () => {
    expect(deliveryReason("sent", null)).toEqual({
      title: "Entregue ao provedor",
      detail: null,
      hint: null,
    })
  })

  it("bounced carries provider error and an action hint", () => {
    const r = deliveryReason("bounced", " mailbox not found ")
    expect(r.title).toBe("E-mail rejeitado pelo destinatário")
    expect(r.detail).toBe("mailbox not found")
    expect(r.hint).toContain("atualizar o cadastro")
  })

  it("failed treats blank error as no detail", () => {
    const r = deliveryReason("failed", "  ")
    expect(r.title).toBe("Falha no envio")
    expect(r.detail).toBeNull()
  })
})

describe("recipient fallbacks", () => {
  it("shows 'Cliente removido' for null or blank name", () => {
    expect(recipientName(null)).toBe("Cliente removido")
    expect(recipientName("")).toBe("Cliente removido")
    expect(recipientName("Ana")).toBe("Ana")
  })

  it("shows dash for null email", () => {
    expect(recipientEmail(null)).toBe("—")
    expect(recipientEmail("a@b.com")).toBe("a@b.com")
  })
})
