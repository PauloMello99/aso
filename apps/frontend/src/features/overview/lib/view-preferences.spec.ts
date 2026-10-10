import { describe, expect, it } from "vitest"
import {
  DEFAULT_VIEW_PREFERENCES,
  parseViewPreferences,
  serializeViewPreferences,
  viewPreferencesStorageKey,
  withViewPreference,
} from "./view-preferences"

describe("parseViewPreferences", () => {
  it("returns defaults for null, empty and invalid JSON", () => {
    expect(parseViewPreferences(null)).toEqual(DEFAULT_VIEW_PREFERENCES)
    expect(parseViewPreferences("")).toEqual(DEFAULT_VIEW_PREFERENCES)
    expect(parseViewPreferences("{not json")).toEqual(DEFAULT_VIEW_PREFERENCES)
  })

  it("returns defaults for non-object JSON", () => {
    expect(parseViewPreferences("42")).toEqual(DEFAULT_VIEW_PREFERENCES)
    expect(parseViewPreferences("null")).toEqual(DEFAULT_VIEW_PREFERENCES)
    expect(parseViewPreferences("[1]")).toEqual(DEFAULT_VIEW_PREFERENCES)
  })

  it("keeps valid values and falls back per key for invalid ones", () => {
    const out = parseViewPreferences(
      JSON.stringify({
        balance: "line",
        paymentMethods: "list",
        materials: "pizza",
        servicesByType: 3,
        unknownKey: "x",
      }),
    )
    expect(out.balance).toBe("line")
    expect(out.paymentMethods).toBe("list")
    expect(out.materials).toBe(DEFAULT_VIEW_PREFERENCES.materials)
    expect(out.servicesByType).toBe(DEFAULT_VIEW_PREFERENCES.servicesByType)
    expect(out).not.toHaveProperty("unknownKey")
  })

  it("round-trips through serialize", () => {
    const prefs = withViewPreference(
      DEFAULT_VIEW_PREFERENCES,
      "operationsLayout",
      "list",
    )
    expect(parseViewPreferences(serializeViewPreferences(prefs))).toEqual(prefs)
  })
})

describe("viewPreferencesStorageKey", () => {
  it("is scoped by organization", () => {
    expect(viewPreferencesStorageKey("a")).not.toBe(viewPreferencesStorageKey("b"))
  })
})
