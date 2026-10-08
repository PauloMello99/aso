import { describe, expect, it } from "vitest"
import { computeShares } from "./payment-share"

describe("computeShares", () => {
  it("returns 0% for everything when the total is zero", () => {
    const out = computeShares([
      { name: "Dinheiro", cents: 0 },
      { name: "Pix", cents: 0 },
    ])
    expect(out.map((r) => r.percent)).toEqual([0, 0])
  })

  it("handles an empty list", () => {
    expect(computeShares([])).toEqual([])
  })

  it("gives 100% to a single item", () => {
    expect(computeShares([{ name: "Pix", cents: 12345 }])[0]?.percent).toBe(100)
  })

  it("splits evenly with sum closing at exactly 100", () => {
    const out = computeShares([
      { name: "a", cents: 100 },
      { name: "b", cents: 100 },
      { name: "c", cents: 100 },
    ])
    const sum = out.reduce((acc, r) => acc + Math.round(r.percent * 10), 0)
    expect(sum).toBe(1000)
    expect(out.map((r) => r.percent).sort()).toEqual([33.3, 33.3, 33.4])
  })

  it("ignores non-positive values in the total", () => {
    const out = computeShares([
      { name: "a", cents: 300 },
      { name: "b", cents: 100 },
      { name: "estorno", cents: -50 },
    ])
    expect(out.map((r) => r.percent)).toEqual([75, 25, 0])
  })
})
