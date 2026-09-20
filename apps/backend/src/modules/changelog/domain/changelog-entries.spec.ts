import {
  CHANGELOG_ENTRIES,
  NOTIFY_FROM_VERSION,
  getEntriesNewerThan,
  getLatestVersion,
  getNotifiableEntries,
  selectNotifiableEntries,
} from "./changelog-entries";
import { CHANGELOG_MODULE_HREFS, ChangelogEntry } from "./changelog-entry";
import { compareSemver, parseSemver } from "./changelog-semver";

describe("CHANGELOG_ENTRIES", () => {
  it("tem ids únicos", () => {
    const ids = CHANGELOG_ENTRIES.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  // "entry_id" é metade do contrato de dedupe de changelog_notifications: renomear um id
  // reenvia a todos e reaproveitar um id antigo suprime o envio silenciosamente. Novos
  // itens devem ser ADICIONADOS a esta lista (os ids existentes devem seguir presentes e
  // inalterados; novos são permitidos).
  it("preserva os ids históricos do registry (contrato de dedupe)", () => {
    const HISTORICAL_IDS: string[] = [
      "low-stock-alert",
      "installment-card-fee",
      "member-payment",
      "campaign-delivery-report",
    ];
    const ids = CHANGELOG_ENTRIES.map((e) => e.id);
    for (const id of HISTORICAL_IDS) {
      expect(ids).toContain(id);
    }
    expect(HISTORICAL_IDS.length).toBeGreaterThan(0);
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

  it("todo item tem semver MAJOR.MINOR.PATCH", () => {
    for (const e of CHANGELOG_ENTRIES) {
      expect(e.semver).toMatch(/^\d+\.\d+\.\d+$/);
    }
  });

  it("semver de itens no/abaixo do corte pode repetir mas não decresce com o ordinal", () => {
    const baseline = [...CHANGELOG_ENTRIES]
      .filter((e) => e.version <= NOTIFY_FROM_VERSION)
      .sort((a, b) => a.version - b.version);
    baseline.forEach((e, i) => {
      const previous = i > 0 ? baseline[i - 1] : undefined;
      if (previous) {
        expect(compareSemver(e.semver, previous.semver)).toBeGreaterThanOrEqual(0);
      }
    });
  });

  it("semver de itens acima do corte é único e estritamente crescente com o ordinal", () => {
    const above = [...CHANGELOG_ENTRIES]
      .filter((e) => e.version > NOTIFY_FROM_VERSION)
      .sort((a, b) => a.version - b.version);
    const lastBaseline = [...CHANGELOG_ENTRIES]
      .filter((e) => e.version <= NOTIFY_FROM_VERSION)
      .sort((a, b) => b.version - a.version)[0];
    above.forEach((e, i) => {
      const previous = i > 0 ? above[i - 1] : lastBaseline;
      if (previous) {
        expect(compareSemver(e.semver, previous.semver)).toBe(1);
      }
    });
    const semvers = above.map((e) => e.semver);
    expect(new Set(semvers).size).toBe(semvers.length);
  });

  it("todo item tem patch 0 (patch nunca gera item de changelog)", () => {
    for (const e of CHANGELOG_ENTRIES) {
      expect(parseSemver(e.semver)?.patch).toBe(0);
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

describe("getNotifiableEntries", () => {
  it("é vazio com o seed atual", () => {
    expect(getNotifiableEntries()).toEqual([]);
  });
});

function buildFakeEntry(overrides: Partial<ChangelogEntry> = {}): ChangelogEntry {
  return {
    id: "entry",
    version: 1,
    title: "Título",
    summary: "Resumo",
    audience: "owners",
    publishedAt: "2026-09-01",
    semver: "1.0.0",
    ...overrides,
  };
}

describe("selectNotifiableEntries", () => {
  const baseline = buildFakeEntry({ id: "b4", version: 4, semver: "1.0.0" });

  it("primeiro item acima do corte com MINOR maior que o baseline => notifica", () => {
    const e5 = buildFakeEntry({ id: "e5", version: 5, semver: "1.1.0" });
    expect(
      selectNotifiableEntries([e5, baseline], 4).map((e) => e.id),
    ).toEqual(["e5"]);
  });

  it("mesmo semver do anterior => não notifica", () => {
    const e5 = buildFakeEntry({ id: "e5", version: 5, semver: "1.0.0" });
    expect(selectNotifiableEntries([baseline, e5], 4)).toEqual([]);
  });

  it("regressão de semver => não notifica", () => {
    const e5 = buildFakeEntry({ id: "e5", version: 5, semver: "0.9.0" });
    expect(selectNotifiableEntries([baseline, e5], 4)).toEqual([]);
  });

  it("patch => não notifica", () => {
    const e5 = buildFakeEntry({ id: "e5", version: 5, semver: "1.0.1" });
    expect(selectNotifiableEntries([baseline, e5], 4)).toEqual([]);
  });

  it("MAJOR maior => notifica", () => {
    const e5 = buildFakeEntry({ id: "e5", version: 5, semver: "2.0.0" });
    expect(
      selectNotifiableEntries([baseline, e5], 4).map((e) => e.id),
    ).toEqual(["e5"]);
  });

  it("item abaixo/no corte nunca notifica, mesmo com MINOR maior que o anterior", () => {
    const e3 = buildFakeEntry({ id: "e3", version: 3, semver: "1.0.0" });
    const e4 = buildFakeEntry({ id: "e4", version: 4, semver: "1.1.0" });
    expect(selectNotifiableEntries([e3, e4], 4)).toEqual([]);
  });

  it("anterior abaixo do corte é usado como referência do primeiro item acima", () => {
    const e4 = buildFakeEntry({ id: "e4", version: 4, semver: "1.2.0" });
    const e5 = buildFakeEntry({ id: "e5", version: 5, semver: "1.3.0" });
    expect(
      selectNotifiableEntries([e5, e4], 4).map((e) => e.id),
    ).toEqual(["e5"]);
  });

  it("ordena por ordinal e compara com o anterior da lista COMPLETA (não da filtrada)", () => {
    // Fora de ordem de propósito. e6 (1.1.0) é patch-igual ao e5 (1.1.0): não notifica,
    // embora, na lista filtrada só com notificáveis, o anterior de e6 fosse baseline.
    const e5 = buildFakeEntry({ id: "e5", version: 5, semver: "1.1.0" });
    const e6 = buildFakeEntry({ id: "e6", version: 6, semver: "1.1.0" });
    const e7 = buildFakeEntry({ id: "e7", version: 7, semver: "1.2.0" });
    expect(
      selectNotifiableEntries([e7, e6, baseline, e5], 4).map((e) => e.id),
    ).toEqual(["e5", "e7"]);
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
