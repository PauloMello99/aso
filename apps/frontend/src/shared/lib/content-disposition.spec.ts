import { describe, expect, it } from "vitest"
import { filenameFromContentDisposition } from "./content-disposition"

describe("filenameFromContentDisposition", () => {
  it("le filename entre aspas", () => {
    expect(
      filenameFromContentDisposition(
        'attachment; filename="recibo-pagamento-joao-2026-09-16.pdf"',
        "x.pdf",
      ),
    ).toBe("recibo-pagamento-joao-2026-09-16.pdf")
  })

  it("le filename sem aspas", () => {
    expect(
      filenameFromContentDisposition("attachment; filename=a.pdf", "x.pdf"),
    ).toBe("a.pdf")
  })

  it("prefere filename* (RFC 5987) decodificado", () => {
    expect(
      filenameFromContentDisposition(
        "attachment; filename=\"a.pdf\"; filename*=UTF-8''relat%C3%B3rio.pdf",
        "x.pdf",
      ),
    ).toBe("relatório.pdf")
  })

  it("usa o fallback quando o header e ausente ou sem filename", () => {
    expect(filenameFromContentDisposition(null, "x.pdf")).toBe("x.pdf")
    expect(filenameFromContentDisposition("attachment", "x.pdf")).toBe("x.pdf")
  })

  it("neutraliza separadores de caminho", () => {
    expect(
      filenameFromContentDisposition('attachment; filename="../../a.pdf"', "x.pdf"),
    ).toBe(".._.._a.pdf")
  })
})
