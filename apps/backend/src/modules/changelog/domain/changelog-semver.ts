export interface Semver {
  major: number;
  minor: number;
  patch: number;
}

const SEMVER_REGEX = /^\d+\.\d+\.\d+$/;

/** Converte "MAJOR.MINOR.PATCH"; retorna null se inválido. */
export function parseSemver(value: string): Semver | null {
  if (!SEMVER_REGEX.test(value)) return null;
  const [major, minor, patch] = value.split(".");
  if (major === undefined || minor === undefined || patch === undefined) {
    return null;
  }
  return { major: Number(major), minor: Number(minor), patch: Number(patch) };
}

/** Retorna -1, 0 ou 1; null se qualquer lado for inválido. */
export function compareSemver(a: string, b: string): -1 | 0 | 1 | null {
  const pa = parseSemver(a);
  const pb = parseSemver(b);
  if (!pa || !pb) return null;
  if (pa.major !== pb.major) return pa.major < pb.major ? -1 : 1;
  if (pa.minor !== pb.minor) return pa.minor < pb.minor ? -1 : 1;
  if (pa.patch !== pb.patch) return pa.patch < pb.patch ? -1 : 1;
  return 0;
}

/**
 * Só releases MAJOR ou MINOR notificam owners: MAJOR maior, ou mesmo MAJOR e
 * MINOR maior. Patch, igual, regressão, parse inválido ou sem anterior => false.
 */
export function shouldNotifyOwners(
  semver: string,
  previousSemver: string | null,
): boolean {
  if (previousSemver === null) return false;
  const current = parseSemver(semver);
  const previous = parseSemver(previousSemver);
  if (!current || !previous) return false;
  if (current.major !== previous.major) return current.major > previous.major;
  return current.minor > previous.minor;
}
