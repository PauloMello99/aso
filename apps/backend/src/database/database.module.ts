import { AsyncLocalStorage } from "node:async_hooks";
import { Module, Global, Injectable, Inject } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

/** RLS-aware Drizzle. Per request it resolves to a connection whose
 *  `request.jwt.claims` is set, so the 0000 RLS policies enforce org
 *  isolation at the DB layer. Inject this in normal repositories. */
export const DRIZZLE = Symbol("DRIZZLE");

/** Privileged Drizzle (BYPASSRLS — `postgres`). Use ONLY where RLS cannot
 *  apply: guards that query before the interceptor runs, and bootstrap paths
 *  (sign-up user insert, create-org owner membership). */
export const DRIZZLE_ADMIN = Symbol("DRIZZLE_ADMIN");

/** Internal: the NOBYPASSRLS connection pool (`app_user`). */
const RLS_POOL = Symbol("RLS_POOL");

export type DrizzleDB = ReturnType<typeof drizzle<typeof schema>>;

type RlsStore = { db: DrizzleDB };
const rlsStorage = new AsyncLocalStorage<RlsStore>();

/**
 * Owns the per-request RLS connection lifecycle. The {@link RlsInterceptor}
 * calls {@link runWithClaims} so every query issued through the {@link DRIZZLE}
 * proxy during a request runs on a connection that has set
 *   request.jwt.claims = {"sub": <auth_id>, "role": "authenticated"}
 * inside a transaction (`set_config(..., true)` is transaction-local, so it
 * cleans itself up and never leaks to the next pooled checkout).
 */
@Injectable()
export class RlsContext {
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
      const result = await rlsStorage.run({ db }, fn);
      await client.query("COMMIT");
      return result;
    } catch (err) {
      try {
        await client.query("ROLLBACK");
      } catch {
        /* connection already broken — release will discard it */
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
        // Fallback (no active request context): the app_user pool WITHOUT
        // claims. auth.uid() is null there, so RLS denies everything — the
        // safe default if a repo is ever reached outside a request.
        const fallback = drizzle(pool, { schema });
        return new Proxy(fallback, {
          get(_target, prop, receiver) {
            const active = rlsStorage.getStore()?.db ?? fallback;
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
