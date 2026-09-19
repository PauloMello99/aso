import { describe, expect, it } from "vitest"
import {
  campaignDeliveryReportResponseSchema,
  campaignDeliveryReportRowSchema,
} from "./campaign-delivery-report.schema"

const validRow = {
  id: "1",
  customerId: "c1",
  customerName: "Ana",
  customerEmail: "ana@example.com",
  trigger: "post_service" as const,
  status: "sent" as const,
  attempt: 1,
  error: null,
  sentAt: "2026-09-18T12:00:00.000Z",
  createdAt: "2026-09-18T11:59:00.000Z",
}

describe("campaignDeliveryReportRowSchema", () => {
  it("aceita uma linha completa e válida", () => {
    const result = campaignDeliveryReportRowSchema.safeParse(validRow)
    expect(result.success).toBe(true)
  })

  it("aceita customerName, customerEmail, error e sentAt nulos", () => {
    const result = campaignDeliveryReportRowSchema.safeParse({
      ...validRow,
      customerName: null,
      customerEmail: null,
      error: "SMTP timeout",
      sentAt: null,
      status: "failed",
    })
    expect(result.success).toBe(true)
  })

  it("rejeita status fora do enum", () => {
    const result = campaignDeliveryReportRowSchema.safeParse({
      ...validRow,
      status: "pending",
    })
    expect(result.success).toBe(false)
  })
})

describe("campaignDeliveryReportResponseSchema", () => {
  it("parseia a resposta completa com items preenchidos", () => {
    const result = campaignDeliveryReportResponseSchema.safeParse({
      summary: { sent: 1, failed: 0, bounced: 0 },
      items: [validRow],
    })
    expect(result.success).toBe(true)
  })

  it("aceita items vazio", () => {
    const result = campaignDeliveryReportResponseSchema.safeParse({
      summary: { sent: 0, failed: 0, bounced: 0 },
      items: [],
    })
    expect(result.success).toBe(true)
  })
})
