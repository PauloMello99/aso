import { describe, expect, it } from "vitest"
import { cn } from "./utils"

describe("cn", () => {
  it("junta classes simples ignorando valores falsy", () => {
    expect(cn("a", false, undefined, "b")).toBe("a b")
  })

  it("resolve conflitos do Tailwind mantendo a última classe", () => {
    expect(cn("p-2", "p-4")).toBe("p-4")
  })

  it("aplica classes condicionais via objeto", () => {
    expect(cn("base", { active: true, disabled: false })).toBe("base active")
  })
})
