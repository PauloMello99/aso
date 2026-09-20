import { describe, expect, it } from "vitest"
import {
  changelogEntrySchema,
  changelogResponseSchema,
  markChangelogSeenSchema,
} from "./changelog.schema"

const entryWithoutOptionals = {
  id: "1",
  version: 3,
  title: "Novidade",
  summary: "Resumo",
  audience: "all" as const,
  publishedAt: "2026-09-18T12:00:00.000Z",
  semver: "1.0.0",
}

const validEntry = {
  ...entryWithoutOptionals,
  highlights: ["a", "b"],
  module: "stock",
}

describe("changelogEntrySchema", () => {
  it("aceita uma entrada completa", () => {
    expect(changelogEntrySchema.safeParse(validEntry).success).toBe(true)
  })

  it("aceita highlights e module ausentes ou nulos", () => {
    expect(changelogEntrySchema.safeParse(entryWithoutOptionals).success).toBe(
      true,
    )
    expect(
      changelogEntrySchema.safeParse({
        ...entryWithoutOptionals,
        highlights: null,
        module: null,
      }).success,
    ).toBe(true)
  })

  it("rejeita audience desconhecida", () => {
    expect(
      changelogEntrySchema.safeParse({ ...validEntry, audience: "admins" })
        .success,
    ).toBe(false)
  })
})

describe("changelogResponseSchema", () => {
  it("aceita seenVersion nulo", () => {
    const result = changelogResponseSchema.safeParse({
      entries: [validEntry],
      seenVersion: null,
      latestVersion: 3,
    })
    expect(result.success).toBe(true)
  })

  it("rejeita latestVersion ausente", () => {
    expect(
      changelogResponseSchema.safeParse({ entries: [], seenVersion: null })
        .success,
    ).toBe(false)
  })
})

describe("markChangelogSeenSchema", () => {
  it("exige version inteira maior ou igual a 1", () => {
    expect(markChangelogSeenSchema.safeParse({ version: 2 }).success).toBe(true)
    expect(markChangelogSeenSchema.safeParse({ version: 1 }).success).toBe(true)
    expect(markChangelogSeenSchema.safeParse({ version: 0 }).success).toBe(false)
    expect(markChangelogSeenSchema.safeParse({ version: -1 }).success).toBe(false)
    expect(markChangelogSeenSchema.safeParse({ version: 1.5 }).success).toBe(false)
  })
})
