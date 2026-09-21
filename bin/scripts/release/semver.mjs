// Funções puras de SemVer (MAJOR.MINOR.PATCH, sem pré-release/build).
// Sem dependências e sem I/O — testável isoladamente.

const SEMVER_REGEX = /^\d+\.\d+\.\d+$/;

export const BUMP_KINDS = ["major", "minor", "patch"];

/** true se a string é exatamente MAJOR.MINOR.PATCH. */
export function isValidSemver(value) {
  return typeof value === "string" && SEMVER_REGEX.test(value);
}

/** Converte "1.2.3" em { major, minor, patch }. Lança se inválido. */
export function parseSemver(value) {
  if (!isValidSemver(value)) {
    throw new Error(`Versão SemVer inválida: ${JSON.stringify(value)}`);
  }
  const [major, minor, patch] = value.split(".").map(Number);
  return { major, minor, patch };
}

/** Retorna -1, 0 ou 1 (a < b, a == b, a > b). */
export function compareSemver(a, b) {
  const pa = parseSemver(a);
  const pb = parseSemver(b);
  for (const key of ["major", "minor", "patch"]) {
    if (pa[key] !== pb[key]) return pa[key] < pb[key] ? -1 : 1;
  }
  return 0;
}

/** Calcula a próxima versão. major zera minor/patch; minor zera patch. */
export function bumpSemver(value, kind) {
  const { major, minor, patch } = parseSemver(value);
  if (kind === "major") return `${major + 1}.0.0`;
  if (kind === "minor") return `${major}.${minor + 1}.0`;
  if (kind === "patch") return `${major}.${minor}.${patch + 1}`;
  throw new Error(
    `Tipo de bump inválido: ${JSON.stringify(kind)} (use ${BUMP_KINDS.join(", ")})`,
  );
}
