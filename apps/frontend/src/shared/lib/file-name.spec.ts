import { describe, expect, it } from "vitest"
import { extensionOf, joinFileName, splitFileName } from "./file-name"

describe("extensionOf", () => {
  it("extracts a simple extension", () => {
    expect(extensionOf("foto.pdf")).toBe(".pdf")
    expect(extensionOf("foto.jpeg")).toBe(".jpeg")
  })

  it("returns empty string when there is no extension", () => {
    expect(extensionOf("documento")).toBe("")
  })

  it("treats a leading dot as a hidden file with no extension", () => {
    expect(extensionOf(".gitignore")).toBe("")
  })

  it("uses only the last dot when the name has internal dots", () => {
    expect(extensionOf("v1.2 documento.png")).toBe(".png")
  })

  it("extracts the extension from the basename of a full path", () => {
    expect(extensionOf("orgId/customerId/uuid_doc.pdf")).toBe(".pdf")
  })
})

describe("splitFileName", () => {
  it("splits base and extension", () => {
    expect(splitFileName("foto.pdf")).toEqual({ base: "foto", ext: ".pdf" })
  })

  it("returns the whole name as base when there is no extension", () => {
    expect(splitFileName("documento")).toEqual({
      base: "documento",
      ext: "",
    })
  })

  it("treats a dotfile as base with no extension", () => {
    expect(splitFileName(".gitignore")).toEqual({
      base: ".gitignore",
      ext: "",
    })
  })

  it("splits on the last dot for names with internal dots", () => {
    expect(splitFileName("v1.2 documento.png")).toEqual({
      base: "v1.2 documento",
      ext: ".png",
    })
  })
})

describe("joinFileName", () => {
  it("joins base and extension", () => {
    expect(joinFileName("foto", ".pdf")).toBe("foto.pdf")
  })

  it("returns just the trimmed base when extension is empty", () => {
    expect(joinFileName("doc", "")).toBe("doc")
    expect(joinFileName("  doc  ", "")).toBe("doc")
  })

  it("trims the base before joining", () => {
    expect(joinFileName("  foto  ", ".pdf")).toBe("foto.pdf")
  })
})
