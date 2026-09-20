// Versionamento SemVer unificado do monorepo (ADR-0031).
//
// Uso:
//   node bin/scripts/release/version.mjs check
//   node bin/scripts/release/version.mjs bump <major|minor|patch>
//
// A versão é única: raiz, apps/backend e apps/frontend andam sempre juntos.
// Não existe comando para definir versão arbitrária nem para versionar um app
// isoladamente — de propósito, para impedir disparidade.

import { readFileSync, writeFileSync, renameSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { BUMP_KINDS, bumpSemver, isValidSemver } from "./semver.mjs";

// bin/scripts/release -> raiz do repositório (3 níveis acima).
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

const TARGETS = [
  { label: "raiz", file: resolve(REPO_ROOT, "package.json") },
  { label: "apps/backend", file: resolve(REPO_ROOT, "apps/backend/package.json") },
  { label: "apps/frontend", file: resolve(REPO_ROOT, "apps/frontend/package.json") },
];

// Só a linha "version" de nível superior (2 espaços de indentação).
const VERSION_LINE = /^(  "version"\s*:\s*")([^"]*)(")/m;

function fail(message) {
  console.error(message);
  process.exit(1);
}

// Lê cada package.json e extrai a versão sem reserializar o JSON.
function readVersions() {
  return TARGETS.map((target) => {
    const content = readFileSync(target.file, "utf8");
    const match = content.match(VERSION_LINE);
    return { ...target, content, version: match ? match[2] : null };
  });
}

// Retorna a lista de problemas (vazia = ok).
function findProblems(entries) {
  const problems = [];
  for (const entry of entries) {
    if (entry.version === null) {
      problems.push(`${entry.label}: campo "version" ausente`);
    } else if (!isValidSemver(entry.version)) {
      problems.push(`${entry.label}: versão inválida "${entry.version}"`);
    }
  }
  const distinct = new Set(entries.map((e) => e.version));
  if (distinct.size > 1) {
    const detail = entries.map((e) => `${e.label}=${e.version}`).join(", ");
    problems.push(`versões divergentes (${detail})`);
  }
  return problems;
}

function check() {
  const entries = readVersions();
  const problems = findProblems(entries);
  if (problems.length > 0) {
    fail(`Version lockstep FALHOU:\n- ${problems.join("\n- ")}`);
  }
  console.log(`Version lockstep ok: ${entries[0].version}`);
  return entries;
}

function bump(kind) {
  if (!BUMP_KINDS.includes(kind)) {
    fail(`Uso: bump <${BUMP_KINDS.join("|")}>`);
  }

  // Recusa se já existe disparidade.
  const entries = check();
  const current = entries[0].version;
  const next = bumpSemver(current, kind);

  // Calcula e valida tudo antes de gravar qualquer arquivo.
  const updates = entries.map((entry) => ({
    file: entry.file,
    content: entry.content.replace(VERSION_LINE, `$1${next}$3`),
  }));

  // Grava em temporários e renomeia um a um; se algum rename falhar, restaura
  // o conteúdo ORIGINAL dos já trocados (rollback best-effort, tudo ou nada).
  const temps = updates.map((u) => `${u.file}.version.tmp`);
  const renamed = [];
  try {
    updates.forEach((u, i) => writeFileSync(temps[i], u.content));
    temps.forEach((tmp, i) => {
      renameSync(tmp, updates[i].file);
      renamed.push(i);
    });
  } catch (error) {
    temps.forEach((tmp) => rmSync(tmp, { force: true }));
    const unrestored = [];
    for (const i of renamed) {
      try {
        writeFileSync(entries[i].file, entries[i].content);
      } catch {
        unrestored.push(entries[i].file);
      }
    }
    if (unrestored.length > 0) {
      console.error(
        `Bump FALHOU e a restauração também falhou. Restaure manualmente a versão ` +
          `${current} (ex.: "git checkout -- <arquivo>") em:\n- ${unrestored.join("\n- ")}`,
      );
    }
    throw error;
  }

  console.log(`${current} -> ${next}`);
  if (kind !== "patch") {
    console.log(
      `Release ${kind}: exige item no changelog (semver "${next}") e, ao commitar, ` +
        `use "chore(release): v${next}" + tag "v${next}".`,
    );
  } else {
    console.log(`Commit sugerido: "chore(release): v${next}" + tag "v${next}".`);
  }
}

const [command, arg] = process.argv.slice(2);

if (command === "check") {
  check();
} else if (command === "bump") {
  bump(arg);
} else {
  fail("Uso: version.mjs check | bump <major|minor|patch>");
}
