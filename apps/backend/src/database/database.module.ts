import { AsyncLocalStorage } from "node:async_hooks";
import { Module, Global, Injectable, Inject } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

export const DRIZZLE = Symbol("DRIZZLE");

export const DRIZZLE_ADMIN = Symbol("DRIZZLE_ADMIN");

const RLS_POOL = Symbol("RLS_POOL");

export type DrizzleDB = ReturnType<typeof drizzle<typeof schema>>;

type RlsStore = {
  db: DrizzleDB;
  memo: Map<string, Promise<unknown>>;
};
const rlsStorage = new AsyncLocalStorage<RlsStore>();

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
      const result = await rlsStorage.run({ db, memo: new Map() }, fn);
      await client.query("COMMIT");
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
