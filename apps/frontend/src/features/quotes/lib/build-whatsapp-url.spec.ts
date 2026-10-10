import { describe, expect, it } from "vitest"
import { buildWhatsappUrl } from "./build-whatsapp-url"

describe("buildWhatsappUrl", () => {
  it("prefixes 55 when the number does not start with +", () => {
    expect(buildWhatsappUrl("(11) 91234-5678")).toBe("https://wa.me/5511912345678")
  })

  it("keeps the country code when the number starts with +", () => {
    expect(buildWhatsappUrl("+351 912 345 678")).toBe("https://wa.me/351912345678")
    expect(buildWhatsappUrl("  +55 11 91234-5678 ")).toBe(
      "https://wa.me/5511912345678",
    )
  })

  it("never adds a pre-filled text parameter", () => {
    expect(buildWhatsappUrl("11912345678")).not.toContain("?")
  })

  it("returns null for empty or digitless input", () => {
    expect(buildWhatsappUrl("")).toBeNull()
    expect(buildWhatsappUrl("   ")).toBeNull()
    expect(buildWhatsappUrl("abc")).toBeNull()
    expect(buildWhatsappUrl("+")).toBeNull()
    expect(buildWhatsappUrl(null)).toBeNull()
    expect(buildWhatsappUrl(undefined)).toBeNull()
  })
})
