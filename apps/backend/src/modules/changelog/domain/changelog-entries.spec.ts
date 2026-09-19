import {
  CHANGELOG_ENTRIES,
  getEntriesNewerThan,
  getLatestVersion,
} from "./changelog-entries";
import { CHANGELOG_MODULE_HREFS } from "./changelog-entry";

describe("CHANGELOG_ENTRIES", () => {
  it("tem ids únicos", () => {
    const ids = CHANGELOG_ENTRIES.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("tem versions inteiras, únicas e estritamente decrescentes", () => {
    CHANGELOG_ENTRIES.forEach((e, i) => {
      expect(Number.isInteger(e.version)).toBe(true);
      if (i > 0) {
        expect(e.version).toBeLessThan(CHANGELOG_ENTRIES[i - 1].version);
      }
    });
  });

  it("tem publishedAt como data ISO válida", () => {
    for (const e of CHANGELOG_ENTRIES) {
      expect(e.publishedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Number.isNaN(new Date(e.publishedAt).getTime())).toBe(false);
    }
  });

  it("todo item com notifyOwners true tem audience definida", () => {
    for (const e of CHANGELOG_ENTRIES) {
      if (e.notifyOwners) {
        expect(["all", "owners"]).toContain(e.audience);
      }
    }
  });

  it("seed inicial nunca dispara e-mail", () => {
    for (const e of CHANGELOG_ENTRIES) {
      expect(e.notifyOwners).toBe(false);
    }
  });

  it("todo entry.module pertence ao vocabulário de hrefs", () => {
    for (const e of CHANGELOG_ENTRIES) {
      if ("module" in e) {
        expect(CHANGELOG_MODULE_HREFS).toContain(e.module);
      }
    }
  });
});

describe("getLatestVersion", () => {
  it("retorna a maior version do catálogo", () => {
    expect(getLatestVersion()).toBe(
      Math.max(...CHANGELOG_ENTRIES.map((e) => e.version)),
    );
  });
});

describe("getEntriesNewerThan", () => {
  it("null retorna todas as entradas", () => {
    expect(getEntriesNewerThan(null)).toHaveLength(CHANGELOG_ENTRIES.length);
  });

  it("retorna só entradas com version maior que a informada", () => {
    const latest = getLatestVersion();
    expect(getEntriesNewerThan(latest)).toEqual([]);
    const result = getEntriesNewerThan(latest - 1);
    expect(result.map((e) => e.version)).toEqual([latest]);
  });
});
