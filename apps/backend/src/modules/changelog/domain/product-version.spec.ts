import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { CHANGELOG_ENTRIES } from "./changelog-entries";
import { compareSemver, parseSemver } from "./changelog-semver";

// Guard de release (ADR-0031). Este arquivo fica em
// apps/backend/src/modules/changelog/domain -> raiz do repo = 6 níveis acima.
const REPO_ROOT = resolve(__dirname, "../../../../../..");

function readVersion(relativePath: string): string {
  const raw = readFileSync(resolve(REPO_ROOT, relativePath), "utf8");
  const parsed: unknown = JSON.parse(raw);
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    typeof (parsed as { version?: unknown }).version !== "string"
  ) {
    throw new Error(`${relativePath}: campo "version" ausente`);
  }
  return (parsed as { version: string }).version;
}

const rootVersion = readVersion("package.json");
const backendVersion = readVersion("apps/backend/package.json");
const frontendVersion = readVersion("apps/frontend/package.json");

describe("versão do produto", () => {
  it("raiz, backend e frontend têm a mesma versão SemVer válida", () => {
    expect(parseSemver(rootVersion)).not.toBeNull();
    expect(backendVersion).toBe(rootVersion);
    expect(frontendVersion).toBe(rootVersion);
  });

  it("o item mais novo do changelog não anuncia release futuro", () => {
    const newest = [...CHANGELOG_ENTRIES].sort(
      (a, b) => b.version - a.version,
    )[0];
    expect(newest).toBeDefined();
    if (newest) {
      expect(compareSemver(newest.semver, rootVersion)).toBeLessThanOrEqual(0);
    }
  });

  it("release minor/major (patch 0) tem item de changelog com semver igual", () => {
    const parsed = parseSemver(rootVersion);
    if (parsed && parsed.patch === 0) {
      expect(CHANGELOG_ENTRIES.some((e) => e.semver === rootVersion)).toBe(true);
    }
  });

  it("a versão do produto não é menor que nenhum item", () => {
    for (const e of CHANGELOG_ENTRIES) {
      expect(compareSemver(e.semver, rootVersion)).toBeLessThanOrEqual(0);
    }
  });
});
