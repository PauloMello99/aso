import { describe, expect, it } from "vitest"
import { overviewVisibility } from "./overview-visibility"

describe("overviewVisibility", () => {
  it("owner sees every card regardless of permissions", () => {
    const vis = overviewVisibility("owner", [])

    expect(vis).toEqual({
      services: true,
      schedule: true,
      stock: true,
      cashier: true,
      clients: true,
      hasAnyCard: true,
    })
  })

  it("employee with services and schedule permissions only sees those cards", () => {
    const vis = overviewVisibility("employee", ["services", "schedule"])

    expect(vis.services).toBe(true)
    expect(vis.schedule).toBe(true)
    expect(vis.stock).toBe(false)
    expect(vis.cashier).toBe(false)
    expect(vis.clients).toBe(false)
    expect(vis.hasAnyCard).toBe(true)
  })

  it("employee with only stock permission sees only the stock card", () => {
    const vis = overviewVisibility("employee", ["stock"])

    expect(vis).toEqual({
      services: false,
      schedule: false,
      stock: true,
      cashier: false,
      clients: false,
      hasAnyCard: true,
    })
  })

  it("employee with no permissions has no visible card", () => {
    const vis = overviewVisibility("employee", [])

    expect(vis.hasAnyCard).toBe(false)
  })

  it("employee with cashier permission sees cashier but not clients", () => {
    const vis = overviewVisibility("employee", ["cashier"])

    expect(vis.cashier).toBe(true)
    expect(vis.clients).toBe(false)
  })
})
