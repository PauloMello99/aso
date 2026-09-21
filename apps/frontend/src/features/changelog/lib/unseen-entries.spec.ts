import { describe, expect, it } from "vitest"
import type { ChangelogEntry } from "../schemas/changelog.schema"
import { getUnseenEntries } from "./unseen-entries"

function buildEntry(overrides: Partial<ChangelogEntry> = {}): ChangelogEntry {
  return {
    id: "e1",
    version: 1,
    title: "t",
    summary: "s",
    audience: "all",
    publishedAt: "2026-09-18T12:00:00.000Z",
    semver: "1.0.0",
    ...overrides,
  }
}

const entries: ChangelogEntry[] = [
  buildEntry({ id: "a", version: 1 }),
  buildEntry({ id: "b", version: 2, audience: "owners" }),
  buildEntry({ id: "c", version: 3, module: "stock" }),
  buildEntry({ id: "d", version: 4, module: "campaigns" }),
]

const ids = (list: ChangelogEntry[]) => list.map((e) => e.id)

describe("getUnseenEntries", () => {
  it("owner vê todas as entradas não vistas", () => {
    expect(ids(getUnseenEntries(entries, null, "owner", []))).toEqual([
      "a",
      "b",
      "c",
      "d",
    ])
  })

  it("employee não vê audience owners", () => {
    const result = getUnseenEntries(entries, null, "employee", ["stock"])
    expect(ids(result)).not.toContain("b")
  })

  it("oculta entrada de módulo sem permissão", () => {
    const result = getUnseenEntries(entries, null, "employee", [])
    expect(ids(result)).not.toContain("c")
    expect(ids(result)).toContain("a")
  })

  it("mostra entrada de módulo com permissão", () => {
    const result = getUnseenEntries(entries, null, "employee", ["stock"])
    expect(ids(result)).toContain("c")
  })

  it("oculta módulo owner-only (campaigns) para employee", () => {
    const result = getUnseenEntries(entries, null, "employee", [
      "stock",
      "campaigns",
    ])
    expect(ids(result)).not.toContain("d")
  })

  it("módulo sem item de nav associado fica visível por audience", () => {
    const list = [buildEntry({ id: "x", version: 1, module: "desconhecido" })]
    expect(ids(getUnseenEntries(list, null, "employee", []))).toEqual(["x"])
  })

  it("seenVersion filtra versões já vistas", () => {
    expect(ids(getUnseenEntries(entries, 2, "owner", []))).toEqual(["c", "d"])
  })

  it("seenVersion igual à última versão não retorna nada", () => {
    expect(getUnseenEntries(entries, 4, "owner", [])).toEqual([])
  })
})
