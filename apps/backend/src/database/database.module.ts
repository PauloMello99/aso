import { AsyncLocalStorage } from "node:async_hooks";
import { Module, Global, Injectable, Inject, Logger } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool, type PoolClient } from "pg";
import * as schema from "./schema";

export const DRIZZLE = Symbol("DRIZZLE");

export const DRIZZLE_ADMIN = Symbol("DRIZZLE_ADMIN");

const RLS_POOL = Symbol("RLS_POOL");

export type DrizzleDB = ReturnType<typeof drizzle<typeof schema>>;

type RlsStore = {
  db: DrizzleDB;
  memo: Map<string, Promise<unknown>>;
  client: PoolClient;
  savepointSeq: { current: number };
  postCommitHooks: Array<() => void | Promise<void>>;
};
const rlsStorage = new AsyncLocalStorage<RlsStore>();
const postCommitLogger = new Logger("PostCommit");

export function requestMemo<T>(
  key: string,
  factory: () => Promise<T>,
): Promise<T> {
  const store = rlsStorage.getStore();
  if (!store) return factory();
  const cached = store.memo.get(key) as Promise<T> | undefined;
  if (cached) return cached;
  const p = factory();
  store.memo.set(key, p);
  return p;
}

// Registra um efeito colateral (ex.: audit log via DRIZZLE_ADMIN) para so
// executar DEPOIS do COMMIT real da transacao do request (RlsContext.
// runWithClaims). Evita gravar efeitos que descrevem uma operacao que na
// verdade nao foi commitada (ver GOTCHA em .memory/domain-rules.md, secao
// RLS). Fora de um request (cron, bootstrap, endpoint publico sem authId,
// teste direto) nao ha store: o efeito roda imediatamente, sem await do
// caller (antes era awaited - a mudanca e deliberada, o hook trata o
// proprio erro).
export function registerPostCommit(fn: () => void | Promise<void>): void {
  const store = rlsStorage.getStore();
  if (!store) {
    void Promise.resolve()
      .then(fn)
      .catch((err) => {
        postCommitLogger.error(
          `Falha ao executar hook pos-commit: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      });
    return;
  }
  store.postCommitHooks.push(fn);
}

@Injectable()
export class RlsContext {
  private readonly logger = new Logger(RlsContext.name);

  constructor(@Inject(RLS_POOL) private readonly pool: Pool) {}

  async runWithClaims<T>(authId: string, fn: () => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const claims = JSON.stringify({ sub: authId, role: "authenticated" });
      await client.query("SELECT set_config('request.jwt.claims', $1, true)", [
        claims,
      ]);
      const db = drizzle(client, { schema }) as unknown as DrizzleDB;
      const postCommitHooks: RlsStore["postCommitHooks"] = [];
      const result = await rlsStorage.run(
        {
          db,
          memo: new Map(),
          client,
          savepointSeq: { current: 0 },
          postCommitHooks,
        },
        fn,
      );
      await client.query("COMMIT");
      for (const hook of postCommitHooks) {
        try {
          await hook();
        } catch (err) {
          this.logger.error(
            `Falha ao executar hook pos-commit: ${
              err instanceof Error ? err.message : String(err)
            }`,
          );
        }
      }
      return result;
    } catch (err) {
      try {
        await client.query("ROLLBACK");
      } catch {
        void 0;
      }
      throw err;
    } finally {
      client.release();
    }
  }
}

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: DRIZZLE_ADMIN,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const pool = new Pool({
          connectionString: config.getOrThrow<string>("DATABASE_URL"),
        });
        return drizzle(pool, { schema });
      },
    },
    {
      provide: RLS_POOL,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new Pool({
          connectionString:
            config.get<string>("DATABASE_APP_URL") ??
            config.getOrThrow<string>("DATABASE_URL"),
        }),
    },
    {
      provide: DRIZZLE,
      inject: [RLS_POOL],
      useFactory: (pool: Pool) => {
        const fallback = drizzle(pool, { schema });
        return new Proxy(fallback, {
          // Dentro de uma request, "active" ja roda sobre a transacao aberta por
          // RlsContext.runWithClaims na MESMA conexao (client). Um db.transaction()
          // aninhado ali viraria um BEGIN/COMMIT no-op do driver e commitaria a
          // transacao externa prematuramente, resetando request.jwt.claims no meio
          // da execucao (ver GOTCHA em .memory/domain-rules.md, secao RLS). Por
          // isso interceptamos "transaction" nesse caso e simulamos com
          // SAVEPOINT, preservando atomicidade sem tocar no BEGIN/COMMIT externo.
          get(_target, prop, receiver) {
            const store = rlsStorage.getStore();
            const active = store?.db ?? fallback;

            if (prop === "transaction" && store) {
              return async (
                callback: (tx: DrizzleDB) => Promise<unknown>,
                config?: unknown,
              ) => {
                if (config !== undefined) {
                  throw new Error(
                    "Config de transacao (isolationLevel/accessMode) nao e " +
                      "suportado dentro de uma transacao de request ja aberta " +
                      "(interceptada via SAVEPOINT).",
                  );
                }

                const spName = `sp_${store.savepointSeq.current++}`;
                await store.client.query(`SAVEPOINT ${spName}`);
                try {
                  const result = await callback(receiver as DrizzleDB);
                  await store.client.query(`RELEASE SAVEPOINT ${spName}`);
                  return result;
                } catch (err) {
                  try {
                    await store.client.query(`ROLLBACK TO SAVEPOINT ${spName}`);
                  } catch {
                    void 0;
                  }
                  throw err;
                }
              };
            }

            const value = Reflect.get(active, prop, receiver);
            return typeof value === "function" ? value.bind(active) : value;
          },
        }) as DrizzleDB;
      },
    },
    RlsContext,
  ],
  exports: [DRIZZLE, DRIZZLE_ADMIN, RlsContext],
})
export class DatabaseModule {}
