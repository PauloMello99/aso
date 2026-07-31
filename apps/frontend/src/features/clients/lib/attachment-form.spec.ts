import { describe, expect, it } from "vitest"
import { buildAttachmentFormData } from "./attachment-form"

function fakeFile(name = "foto.png"): File {
  return new File(["conteudo"], name, { type: "image/png" })
}

describe("buildAttachmentFormData", () => {
  it("always appends the file", () => {
    const form = buildAttachmentFormData(fakeFile())
    expect(form.get("file")).toBeInstanceOf(File)
  })

  it("omits baseName when undefined", () => {
    const form = buildAttachmentFormData(fakeFile())
    expect(form.has("baseName")).toBe(false)
  })

  it("omits baseName when empty string", () => {
    const form = buildAttachmentFormData(fakeFile(), "")
    expect(form.has("baseName")).toBe(false)
  })

  it("omits baseName when only whitespace", () => {
    const form = buildAttachmentFormData(fakeFile(), "   ")
    expect(form.has("baseName")).toBe(false)
  })

  it("appends the trimmed baseName when provided", () => {
    const form = buildAttachmentFormData(fakeFile(), "  ficha final  ")
    expect(form.get("baseName")).toBe("ficha final")
  })
})
