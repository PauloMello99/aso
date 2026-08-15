import { describe, expect, it } from "vitest"
import { isSlaBreached } from "./ticket-sla"

describe("isSlaBreached", () => {
  it("retorna false quando nenhum SLA foi violado", () => {
    expect(
      isSlaBreached({
        slaFirstResponseBreachedAt: null,
        slaResolutionBreachedAt: null,
      }),
    ).toBe(false)
  })

  it("retorna true quando o SLA de primeira resposta foi violado", () => {
    expect(
      isSlaBreached({
        slaFirstResponseBreachedAt: "2026-01-01T00:00:00.000Z",
        slaResolutionBreachedAt: null,
      }),
    ).toBe(true)
  })

  it("retorna true quando o SLA de resolução foi violado", () => {
    expect(
      isSlaBreached({
        slaFirstResponseBreachedAt: null,
        slaResolutionBreachedAt: "2026-01-01T00:00:00.000Z",
      }),
    ).toBe(true)
  })

  it("retorna true quando ambos os SLAs foram violados", () => {
    expect(
      isSlaBreached({
        slaFirstResponseBreachedAt: "2026-01-01T00:00:00.000Z",
        slaResolutionBreachedAt: "2026-01-01T00:00:00.000Z",
      }),
    ).toBe(true)
  })
})
