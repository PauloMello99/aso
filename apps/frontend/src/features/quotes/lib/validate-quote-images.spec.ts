import { describe, expect, it } from "vitest"
import { validateQuoteImages } from "./validate-quote-images"

function fakeFile(name: string, type: string, size = 1024): File {
  return { name, type, size } as File
}

describe("validateQuoteImages", () => {
  it("aceita lista vazia", () => {
    expect(validateQuoteImages([])).toEqual([])
  })

  it("aceita até 3 imagens de tipos válidos", () => {
    const files = [
      fakeFile("a.jpg", "image/jpeg"),
      fakeFile("b.png", "image/png"),
      fakeFile("c.webp", "image/webp"),
    ]
    expect(validateQuoteImages(files)).toEqual([])
  })

  it("rejeita mais de 3 imagens", () => {
    const files = Array.from({ length: 4 }, (_, i) =>
      fakeFile(`${i}.jpg`, "image/jpeg"),
    )
    expect(validateQuoteImages(files).map((e) => e.reason)).toEqual(["count"])
  })

  it("rejeita arquivo acima de 5 MB e aceita exatamente 5 MB", () => {
    const limit = 5 * 1024 * 1024
    expect(
      validateQuoteImages([fakeFile("a.jpg", "image/jpeg", limit)]),
    ).toEqual([])
    const errors = validateQuoteImages([
      fakeFile("grande.jpg", "image/jpeg", limit + 1),
    ])
    expect(errors).toHaveLength(1)
    expect(errors[0]?.reason).toBe("size")
    expect(errors[0]?.fileName).toBe("grande.jpg")
  })

  it("rejeita tipos não aceitos", () => {
    const errors = validateQuoteImages([
      fakeFile("doc.pdf", "application/pdf"),
      fakeFile("anim.gif", "image/gif"),
    ])
    expect(errors.map((e) => e.reason)).toEqual(["type", "type"])
  })

  it("aceita HEIC/HEIF com type vazio pela extensão (iOS)", () => {
    expect(validateQuoteImages([fakeFile("foto.HEIC", "")])).toEqual([])
    expect(validateQuoteImages([fakeFile("foto.heif", "")])).toEqual([])
  })

  it("rejeita type vazio sem extensão HEIC/HEIF", () => {
    expect(
      validateQuoteImages([fakeFile("foto.jpg", "")]).map((e) => e.reason),
    ).toEqual(["type"])
  })

  it("acumula erros de quantidade e de arquivo", () => {
    const files = [
      fakeFile("a.jpg", "image/jpeg"),
      fakeFile("b.jpg", "image/jpeg"),
      fakeFile("c.jpg", "image/jpeg"),
      fakeFile("d.pdf", "application/pdf"),
    ]
    expect(validateQuoteImages(files).map((e) => e.reason)).toEqual([
      "count",
      "type",
    ])
  })
})
