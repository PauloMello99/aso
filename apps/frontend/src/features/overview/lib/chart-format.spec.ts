import { describe, expect, it } from "vitest"
import {
  formatAxisMoney,
  HIDDEN_AXIS_TICK,
  seriesLabel,
  truncateTick,
} from "./chart-format"

describe("seriesLabel", () => {
  it("maps raw data keys to pt-BR labels and keeps readable names", () => {
    expect(seriesLabel("totalCents")).toBe("Saldo")
    expect(seriesLabel("Entradas")).toBe("Entradas")
    expect(seriesLabel(undefined)).toBe("")
  })
})

describe("formatAxisMoney", () => {
  it("masks every tick when values are hidden", () => {
    expect(formatAxisMoney(15_000_000, true)).toBe(HIDDEN_AXIS_TICK)
    expect(formatAxisMoney(0, true)).toBe(HIDDEN_AXIS_TICK)
    expect(HIDDEN_AXIS_TICK).not.toMatch(/\d/)
  })

  it("uses a compact representation instead of the full amount", () => {
    const out = formatAxisMoney(15_000_000, false)
    expect(out).toMatch(/150/)
    expect(out).not.toMatch(/\d\.\d{3}/)
    expect(out).not.toMatch(/,00/)
  })

  it("keeps the sign for negative balances", () => {
    expect(formatAxisMoney(-15_000_000, false)).toMatch(/^[-−]/)
  })
})

describe("truncateTick", () => {
  it("leaves short labels unchanged", () => {
    expect(truncateTick("Tatuagem", 12)).toBe("Tatuagem")
  })

  it("truncates long labels with an ellipsis within the max length", () => {
    const out = truncateTick("Tatuagem realista fechamento de braço", 12)
    expect(out).toHaveLength(12)
    expect(out.endsWith("…")).toBe(true)
  })
})
