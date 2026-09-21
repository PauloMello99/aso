import { describe, expect, it } from "vitest"
import { hideValuesStorageKey, maskAmount } from "./hide-values"

describe("hideValuesStorageKey", () => {
  it("scopes the key by organization id", () => {
    expect(hideValuesStorageKey("org-1")).toBe("inkops_hide_values_org-1")
    expect(hideValuesStorageKey("org-2")).toBe("inkops_hide_values_org-2")
  })
})

describe("maskAmount", () => {
  it("replaces every digit with a bullet", () => {
    expect(maskAmount("R$ 1.234,56")).toBe("R$ •.•••,••")
  })

  it("keeps sign and currency symbol untouched", () => {
    expect(maskAmount("-R$ 10,00")).toBe("-R$ ••,••")
  })

  it("leaves non-numeric strings unchanged", () => {
    expect(maskAmount("R$ --")).toBe("R$ --")
  })
})
