import { describe, expect, it } from "vitest"
import { centsToReaisInput, parseReaisToCents } from "./money"

describe("parseReaisToCents", () => {
  it("parses dot-decimal without grouping (250.00 -> 25000 cents)", () => {
    expect(parseReaisToCents("250.00")).toBe(25000)
  })

  it("parses comma-decimal without grouping (250,00 -> 25000 cents)", () => {
    expect(parseReaisToCents("250,00")).toBe(25000)
  })

  it("parses pt-BR grouped thousands with comma decimal (1.234,56 -> 123456 cents)", () => {
    expect(parseReaisToCents("1.234,56")).toBe(123456)
  })

  it("parses dot-grouped thousands with no decimal part (1.234 -> 123400 cents)", () => {
    expect(parseReaisToCents("1.234")).toBe(123400)
  })

  it("parses a bare integer (1234 -> 123400 cents)", () => {
    expect(parseReaisToCents("1234")).toBe(123400)
  })

  it("parses dot-decimal with cents (1234.56 -> 123456 cents)", () => {
    expect(parseReaisToCents("1234.56")).toBe(123456)
  })

  it("parses comma-decimal with cents (1234,56 -> 123456 cents)", () => {
    expect(parseReaisToCents("1234,56")).toBe(123456)
  })

  it("parses a single decimal digit (12,3 -> 1230 cents)", () => {
    expect(parseReaisToCents("12,3")).toBe(1230)
  })

  it("round-trips centsToReaisInput output without inflating the value", () => {
    expect(parseReaisToCents(centsToReaisInput(25000))).toBe(25000)
    expect(parseReaisToCents(centsToReaisInput(123456))).toBe(123456)
  })

  it("returns NaN for an empty string", () => {
    expect(Number.isNaN(parseReaisToCents(""))).toBe(true)
  })

  it("returns NaN for a non-numeric string", () => {
    expect(Number.isNaN(parseReaisToCents("abc"))).toBe(true)
  })
})

describe("centsToReaisInput", () => {
  it("formats cents as a comma-decimal editable string", () => {
    expect(centsToReaisInput(25000)).toBe("250,00")
    expect(centsToReaisInput(123456)).toBe("1234,56")
  })
})
