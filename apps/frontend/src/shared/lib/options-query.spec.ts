import { describe, expect, it } from "vitest"
import { buildOptionsQuery, normalizeOptionsParams } from "./options-query"

describe("buildOptionsQuery", () => {
  it("returns empty string when there are no params", () => {
    expect(buildOptionsQuery({})).toBe("")
  })

  it("discards undefined and empty string values", () => {
    expect(buildOptionsQuery({ q: undefined, serviceTypeId: "" })).toBe("")
  })

  it("builds a querystring with a single param", () => {
    expect(buildOptionsQuery({ q: "abc" })).toBe("?q=abc")
  })

  it("keeps insertion order across multiple params", () => {
    expect(
      buildOptionsQuery({ q: "abc", serviceTypeId: "svc-1" }),
    ).toBe("?q=abc&serviceTypeId=svc-1")
  })

  it("skips undefined params in the middle while keeping order of the rest", () => {
    expect(
      buildOptionsQuery({ a: "1", b: undefined, c: "3" }),
    ).toBe("?a=1&c=3")
  })

  it("URL-encodes values", () => {
    expect(buildOptionsQuery({ q: "a b&c" })).toBe("?q=a%20b%26c")
  })
})

describe("normalizeOptionsParams", () => {
  it("returns an equivalent (same cardinality) object for equivalent querystrings", () => {
    // Regressão: options(orgId) e options(orgId, { q: "" }) geravam chaves
    // diferentes ({} vs { q: "" }) para a MESMA URL, duplicando o cache.
    expect(normalizeOptionsParams({})).toEqual(
      normalizeOptionsParams({ q: undefined }),
    )
    expect(normalizeOptionsParams({ q: "" })).toEqual(
      normalizeOptionsParams({}),
    )
  })

  it("drops undefined and empty string values", () => {
    expect(normalizeOptionsParams({ q: undefined, serviceTypeId: "" })).toEqual(
      {},
    )
  })

  it("keeps non-empty values untouched", () => {
    expect(normalizeOptionsParams({ q: "abc", serviceTypeId: "svc-1" })).toEqual(
      { q: "abc", serviceTypeId: "svc-1" },
    )
  })
})
