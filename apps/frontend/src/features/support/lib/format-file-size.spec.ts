import { describe, expect, it } from "vitest"
import { formatFileSize } from "./format-file-size"

describe("formatFileSize", () => {
  it("formata valores menores que 1 KB em bytes", () => {
    expect(formatFileSize(500)).toBe("500 B")
  })

  it("formata valores negativos ou inválidos como 0 B", () => {
    expect(formatFileSize(-10)).toBe("0 B")
    expect(formatFileSize(Number.NaN)).toBe("0 B")
  })

  it("formata KB com uma casa decimal", () => {
    expect(formatFileSize(1536)).toBe("1.5 KB")
  })

  it("formata MB com uma casa decimal", () => {
    expect(formatFileSize(1024 * 1024 * 2.25)).toBe("2.3 MB")
  })

  it("formata GB com uma casa decimal", () => {
    expect(formatFileSize(1024 * 1024 * 1024 * 1.2)).toBe("1.2 GB")
  })
})
