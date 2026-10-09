import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import { DrizzleQuoteRequestPurgeRepository } from "./drizzle-quote-request-purge.repository";
import { QuoteRequestPersistenceError } from "./quote-persistence.error";
import type { DrizzleDB } from "../../../../database/database.module";

const dialect = new PgDialect();

function render(query: SQL | undefined): { sql: string; params: unknown[] } {
  if (!query) throw new Error("query nao capturada");
  const rendered = dialect.sqlToQuery(query);
  return { sql: rendered.sql.toLowerCase().replace(/\s+/g, " "), params: rendered.params };
}

const ORG_ID = "org-1";
const REQUEST_ID = "req-1";
const NOW = new Date("2026-10-08T12:00:00.000Z");
const LEASE_MS = 600_000;
const CLAIMED_AT = new Date("2026-10-08T12:00:00.000Z");

// Fake encadeado: select/update/delete devolvem builder aguardavel; `where`
// captura a condicao; `returning`/`from`/`set` encadeiam.
interface FakeAdmin {
  admin: DrizzleDB;
  wheres: Array<SQL | undefined>;
  executed: SQL[];
  sets: unknown[];
  calls: string[];
}

function buildFakeAdmin(
  results: unknown[] = [],
  executeRows: unknown[] = [],
): FakeAdmin {
  const queue = [...results];
  const wheres: Array<SQL | undefined> = [];
  const executed: SQL[] = [];
  const sets: unknown[] = [];
  const calls: string[] = [];

  function start(kind: string): Record<string, unknown> {
    calls.push(kind);
    const result = queue.shift() ?? [];
    const terminal = Object.assign(Promise.resolve(result), {
      returning: jest.fn(() => Promise.resolve(result)),
    });
    const builder: Record<string, unknown> = {
      from: jest.fn(() => builder),
      set: jest.fn((value: unknown) => {
        sets.push(value);
        return builder;
      }),
      where: jest.fn((condition: SQL | undefined) => {
        wheres.push(condition);
        return terminal;
      }),
    };
    return builder;
  }

  const base = {
    select: jest.fn(() => start("select")),
    update: jest.fn(() => start("update")),
    delete: jest.fn(() => start("delete")),
    execute: jest.fn((query: SQL) => {
      executed.push(query);
      return Promise.resolve({ rows: executeRows });
    }),
  };
  const admin = {
    ...base,
    transaction: jest.fn((fn: (tx: unknown) => Promise<unknown>) => fn(base)),
  } as unknown as DrizzleDB;
  return { admin, wheres, executed, sets, calls };
}

function buildDrizzleLikeError(): Error {
  const driver = Object.assign(new Error("deadlock detected"), { code: "40P01" });
  return new Error(`Failed query: update "quote_requests" params: ${REQUEST_ID},${ORG_ID}`, {
    cause: driver,
  });
}

describe("DrizzleQuoteRequestPurgeRepository", () => {
  describe("claimDuePurges", () => {
    it("reivindica em UM statement com SKIP LOCKED, ordem justa e incremento de tentativas", async () => {
      const { admin, executed } = buildFakeAdmin(
        [],
        [
          {
            id: REQUEST_ID,
            org_id: ORG_ID,
            purge_scope: "images",
            purge_attempts: 3,
            purge_last_attempt_at: "2026-10-08T12:00:00.000Z",
          },
        ],
      );
      const repo = new DrizzleQuoteRequestPurgeRepository(admin);

      const claims = await repo.claimDuePurges(NOW, LEASE_MS, 50);

      expect(executed).toHaveLength(1);
      const { sql, params } = render(executed[0]);
      expect(sql).toContain("for update skip locked");
      expect(sql).toContain(
        "order by purge_attempts asc, purge_last_attempt_at asc nulls first, expires_at asc",
      );
      expect(sql).toContain("purge_attempts = q.purge_attempts + 1");
      expect(sql).toContain("coalesce(q.purge_requested_at,");
      expect(sql).toContain("case when q.expires_at <=");
      expect(sql).toContain("then 'all' else q.purge_scope end");
      expect(sql).toContain("purge_last_attempt_at is null or purge_last_attempt_at <=");
      expect(sql).toContain("returning q.id, q.org_id, q.purge_scope");
      expect(params).toContain(NOW.toISOString());
      expect(params).toContain(new Date(NOW.getTime() - LEASE_MS).toISOString());
      expect(params).toContain(50);
      expect(claims).toEqual([
        {
          id: REQUEST_ID,
          orgId: ORG_ID,
          scope: "images",
          attempts: 3,
          claimedAt: CLAIMED_AT,
        },
      ]);
    });

    it("normaliza escopo desconhecido para 'all' (mais conservador: nunca poupa o dado)", async () => {
      const { admin } = buildFakeAdmin(
        [],
        [
          {
            id: REQUEST_ID,
            org_id: ORG_ID,
            purge_scope: "desconhecido",
            purge_attempts: 1,
            purge_last_attempt_at: CLAIMED_AT,
          },
        ],
      );

      const claims = await new DrizzleQuoteRequestPurgeRepository(admin).claimDuePurges(
        NOW,
        LEASE_MS,
        10,
      );

      expect(claims[0]?.scope).toBe("all");
      expect(claims[0]?.claimedAt).toEqual(CLAIMED_AT);
    });

    it("sanitiza erro de banco (sem sql/params/cause)", async () => {
      const admin = {
        execute: jest.fn().mockRejectedValue(buildDrizzleLikeError()),
      } as unknown as DrizzleDB;

      const error = await new DrizzleQuoteRequestPurgeRepository(admin)
        .claimDuePurges(NOW, LEASE_MS, 10)
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(QuoteRequestPersistenceError);
      const sanitized = error as QuoteRequestPersistenceError;
      expect(sanitized.sqlState).toBe("40P01");
      expect(sanitized.cause).toBeUndefined();
      expect(`${sanitized.message}\n${sanitized.stack ?? ""}`).not.toContain(REQUEST_ID);
    });
  });

  describe("listImagePaths", () => {
    it("filtra por org e pedido", async () => {
      const { admin, wheres } = buildFakeAdmin([[{ storagePath: "org-1/req-1/a.png" }]]);

      const paths = await new DrizzleQuoteRequestPurgeRepository(admin).listImagePaths(
        ORG_ID,
        REQUEST_ID,
      );

      expect(paths).toEqual(["org-1/req-1/a.png"]);
      const { sql, params } = render(wheres[0]);
      expect(sql).toContain('"quote_request_images"."org_id" =');
      expect(sql).toContain('"quote_request_images"."quote_request_id" =');
      expect(params).toEqual([ORG_ID, REQUEST_ID]);
    });
  });

  describe("deleteRequest", () => {
    it("apaga so com org, id e purge_scope = 'all'", async () => {
      const { admin, wheres } = buildFakeAdmin([[{ id: REQUEST_ID }]]);

      const deleted = await new DrizzleQuoteRequestPurgeRepository(admin).deleteRequest(
        ORG_ID,
        REQUEST_ID,
      );

      expect(deleted).toBe(true);
      const { sql, params } = render(wheres[0]);
      expect(sql).toContain('"org_id" =');
      expect(sql).toContain('"id" =');
      expect(sql).toContain('"purge_scope" =');
      expect(params).toEqual([ORG_ID, REQUEST_ID, "all"]);
    });

    it("false quando nenhuma linha casou", async () => {
      const { admin } = buildFakeAdmin([[]]);

      await expect(
        new DrizzleQuoteRequestPurgeRepository(admin).deleteRequest(ORG_ID, REQUEST_ID),
      ).resolves.toBe(false);
    });
  });

  describe("completeImagePurge", () => {
    it("CAS por purge_last_attempt_at e scope images; zera a fila e depois apaga as imagens", async () => {
      const { admin, wheres, sets, calls } = buildFakeAdmin([[{ id: REQUEST_ID }], []]);

      const done = await new DrizzleQuoteRequestPurgeRepository(admin).completeImagePurge(
        ORG_ID,
        REQUEST_ID,
        CLAIMED_AT,
      );

      expect(done).toBe(true);
      expect(calls).toEqual(["update", "delete"]);
      expect(sets[0]).toEqual({
        purgeRequestedAt: null,
        purgeScope: null,
        purgeAttempts: 0,
        purgeLastAttemptAt: null,
        purgeLastError: null,
      });
      const cas = render(wheres[0]);
      expect(cas.sql).toContain('"org_id" =');
      expect(cas.sql).toContain('"purge_scope" =');
      expect(cas.sql).toContain('"purge_last_attempt_at" =');
      expect(cas.params).toEqual([ORG_ID, REQUEST_ID, "images", CLAIMED_AT.toISOString()]);
      const images = render(wheres[1]);
      expect(images.sql).toContain('"quote_request_images"."org_id" =');
      expect(images.params).toEqual([ORG_ID, REQUEST_ID]);
    });

    it("claim perdido (CAS sem linha): retorna false e NAO apaga imagens", async () => {
      const { admin, calls } = buildFakeAdmin([[]]);

      const done = await new DrizzleQuoteRequestPurgeRepository(admin).completeImagePurge(
        ORG_ID,
        REQUEST_ID,
        CLAIMED_AT,
      );

      expect(done).toBe(false);
      expect(calls).toEqual(["update"]);
    });
  });

  describe("recordPurgeFailure", () => {
    it("grava so o codigo, escopado por org e id, em pedido pendente de purga", async () => {
      const { admin, wheres, sets } = buildFakeAdmin([[]]);

      await new DrizzleQuoteRequestPurgeRepository(admin).recordPurgeFailure(
        ORG_ID,
        REQUEST_ID,
        "StorageOperationFailedException",
      );

      expect(sets[0]).toEqual({ purgeLastError: "StorageOperationFailedException" });
      const { sql, params } = render(wheres[0]);
      expect(sql).toContain('"org_id" =');
      expect(sql).toContain('"purge_requested_at" is not null');
      expect(params).toEqual([ORG_ID, REQUEST_ID]);
    });
  });

  describe("findExistingRequestIds", () => {
    it("lista vazia: Set vazio sem consultar o banco", async () => {
      const { admin, calls } = buildFakeAdmin();

      const existing = await new DrizzleQuoteRequestPurgeRepository(
        admin,
      ).findExistingRequestIds(ORG_ID, []);

      expect(existing.size).toBe(0);
      expect(calls).toHaveLength(0);
    });

    it("escopa por org e divide em blocos de 500", async () => {
      const ids = Array.from({ length: 1200 }, (_, i) => `id-${i}`);
      const { admin, wheres } = buildFakeAdmin([[{ id: "id-1" }], [{ id: "id-600" }], []]);

      const existing = await new DrizzleQuoteRequestPurgeRepository(
        admin,
      ).findExistingRequestIds(ORG_ID, ids);

      expect(wheres).toHaveLength(3);
      for (const where of wheres) {
        const { sql, params } = render(where);
        expect(sql).toContain('"org_id" =');
        expect(params[0]).toBe(ORG_ID);
      }
      expect(render(wheres[0]).params).toHaveLength(501);
      expect(render(wheres[2]).params).toHaveLength(201);
      expect([...existing].sort()).toEqual(["id-1", "id-600"]);
    });

    it("erro de banco RELANCA sanitizado (nunca vira conjunto vazio)", async () => {
      const admin = {
        select: jest.fn(() => {
          throw buildDrizzleLikeError();
        }),
      } as unknown as DrizzleDB;

      const error = await new DrizzleQuoteRequestPurgeRepository(admin)
        .findExistingRequestIds(ORG_ID, ["id-1"])
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(QuoteRequestPersistenceError);
      expect((error as QuoteRequestPersistenceError).cause).toBeUndefined();
    });
  });
});
