import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { createHash } from "crypto";
import * as fs from "fs";
import * as path from "path";

const MIGRATIONS_FOLDER = path.resolve(process.cwd(), "drizzle/migrations");
const JOURNAL_PATH = path.join(MIGRATIONS_FOLDER, "meta/_journal.json");
const DRIZZLE_SCHEMA = "drizzle";
const DRIZZLE_TABLE = "__drizzle_migrations";

interface JournalEntry {
  idx: number;
  tag: string;
  when: number;
  breakpoints: boolean;
}

/**
 * Replica o hash exato que drizzle-orm grava em __drizzle_migrations.
 * Fonte: drizzle-orm/migrator.ts → readMigrationFiles()
 *
 * Usado apenas como diagnostico informativo (arquivo mudou desde que foi
 * aplicado?) — NAO decide mais o estado "applied". drizzle-orm's proprio
 * PgDialect.migrate() (pg-core/dialect.ts) nunca compara hash para decidir
 * o que ja rodou: ele usa apenas `created_at` (= journal `when`, aka
 * folderMillis) contra a ultima linha da tabela. Migrations escritas a mao
 * quase sempre sao ajustadas depois do primeiro `db:migrate` de teste local
 * (formatacao, guards IF NOT EXISTS, etc.), o que muda o hash do arquivo
 * permanentemente sem que o DDL precise re-rodar — usar hash como chave de
 * "applied" torna o estado falso-pending de forma irreversivel.
 */
function computeMigrationHash(tag: string): string {
  const sqlPath = path.join(MIGRATIONS_FOLDER, `${tag}.sql`);
  const sql = fs.readFileSync(sqlPath, "utf-8");
  return createHash("sha256").update(sql).digest("hex");
}

function readJournal(): JournalEntry[] {
  if (!fs.existsSync(JOURNAL_PATH)) return [];
  const journal = JSON.parse(fs.readFileSync(JOURNAL_PATH, "utf-8"));
  return journal.entries as JournalEntry[];
}

async function up(): Promise<void> {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);

  console.log("⬆  Applying pending migrations...");
  await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
  console.log("✓  Done.");

  await pool.end();
}

async function down(steps: number): Promise<void> {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  const entries = readJournal().sort((a, b) => b.idx - a.idx); // newest first

  let rolledBack = 0;

  for (const entry of entries) {
    if (rolledBack >= steps) break;

    // Identidade de "applied" = created_at gravado igual ao journal `when`
    // (folderMillis), o mesmo campo que o migrate() do drizzle-orm usa —
    // nao o hash, que muda se o .sql for editado apos a aplicacao original.
    const { rowCount } = await pool.query(
      `SELECT id FROM ${DRIZZLE_SCHEMA}.${DRIZZLE_TABLE} WHERE created_at = $1`,
      [entry.when],
    );

    if (!rowCount) continue; // migration not applied, skip

    const downPath = path.join(MIGRATIONS_FOLDER, `${entry.tag}.down.sql`);

    if (!fs.existsSync(downPath)) {
      throw new Error(
        `\n✗  Down migration not found: ${entry.tag}.down.sql\n` +
          `   Create it before rolling back this migration.\n`,
      );
    }

    const downSql = fs.readFileSync(downPath, "utf-8");

    console.log(`↩  Rolling back: ${entry.tag}`);

    await pool.query("BEGIN");
    try {
      await pool.query(downSql);
      await pool.query(
        `DELETE FROM ${DRIZZLE_SCHEMA}.${DRIZZLE_TABLE} WHERE created_at = $1`,
        [entry.when],
      );
      await pool.query("COMMIT");
    } catch (err) {
      await pool.query("ROLLBACK");
      throw err;
    }

    console.log(`✓  Rolled back: ${entry.tag}`);
    rolledBack++;
  }

  if (rolledBack === 0) {
    console.log("  Nothing to roll back.");
  }

  await pool.end();
}

async function status(): Promise<void> {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  const entries = readJournal().sort((a, b) => a.idx - b.idx);

  const { rows } = await pool.query<{ hash: string; created_at: string }>(
    `SELECT hash, created_at FROM ${DRIZZLE_SCHEMA}.${DRIZZLE_TABLE} ORDER BY created_at ASC`,
  );

  // created_at é gravado a partir do journal `when` (folderMillis) — é essa
  // a chave de identidade que o migrate() do drizzle-orm usa para decidir o
  // que já rodou. O hash por linha é só o que foi calculado NAQUELE momento;
  // comparar contra o hash atual do arquivo serve só de diagnóstico abaixo.
  const hashByCreatedAt = new Map(rows.map((r) => [Number(r.created_at), r.hash]));

  console.log("\nMigrations status:\n");

  for (const entry of entries) {
    const dbHash = hashByCreatedAt.get(entry.when);
    const applied = dbHash !== undefined;
    const downExists = fs.existsSync(
      path.join(MIGRATIONS_FOLDER, `${entry.tag}.down.sql`),
    );
    const downLabel = downExists ? "" : " (no .down.sql)";

    let status = applied ? `✓ applied${downLabel}` : "○ pending";
    if (applied && dbHash !== computeMigrationHash(entry.tag)) {
      status += " (file changed since applied)";
    }

    console.log(`  [${status}] ${entry.tag}`);
  }

  console.log();

  await pool.end();
}

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set. Check your .env file.");
  }

  const command = process.argv[2];
  const steps = parseInt(process.argv[3] ?? "1", 10);

  switch (command) {
    case "up":
      await up();
      break;
    case "down":
      if (isNaN(steps) || steps < 1) {
        throw new Error("Steps must be a positive integer. Usage: down [steps]");
      }
      await down(steps);
      break;
    case "status":
      await status();
      break;
    default:
      console.error(
        "Usage: migrator.ts <up | down [steps] | status>\n\n" +
          "  up            Apply all pending migrations\n" +
          "  down [n]      Roll back the last n migrations (default: 1)\n" +
          "  status        Show applied/pending state of all migrations\n",
      );
      process.exit(1);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
