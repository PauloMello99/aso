import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import { DrizzleQuoteRequestRepository } from "./drizzle-quote-request.repository";
import { QuoteRequestPersistenceError } from "./quote-persistence.error";
import { CreateQuoteRequestData } from "../../domain/quote-request.repository.interface";
import type { DrizzleDB } from "../../../../database/database.module";

const request: CreateQuoteRequestData = {
  id: "11111111-1111-1111-1111-111111111111",
  orgId: "org-1",
  targetUserId: "user-1",
  requesterName: "Joao Cliente",
  requesterPhone: "+5511999998888",
  requesterEmail: "joao@example.com",
  idea: "Um leao no antebraco",
  consentVersion: "v1",
  consentTextSnapshot: "texto",
  privacyConsentAcceptedAt: new Date("2026-10-01T00:00:00Z"),
  contactRetentionConsentAcceptedAt: null,
  createdAt: new Date("2026-10-01T00:00:00Z"),
  expiresAt: new Date("2026-10-31T00:00:00Z"),
};

// Simula DrizzleQueryError: message com sql + params e o erro do driver em cause.
function buildDrizzleLikeError(): Error {
  const driver = Object.assign(new Error("duplicate key value"), {
    code: "23505",
  });
  return new Error(
    `Failed query: insert into "quote_requests" values ($1,$2,$3,$4) params: ${request.requesterName},${request.requesterPhone},${request.requesterEmail},${request.idea}`,
    { cause: driver },
  );
}

describe("DrizzleQuoteRequestRepository", () => {
  it("rethrows a sanitized error without PII, sql, params or cause", async () => {
    const admin = {
      transaction: jest.fn().mockRejectedValue(buildDrizzleLikeError()),
    } as unknown as DrizzleDB;
    const repo = new DrizzleQuoteRequestRepository({} as DrizzleDB, admin);

    const error = await repo
      .createWithImagesAsAdmin(request, [])
      .then(() => null)
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(QuoteRequestPersistenceError);
    const sanitized = error as QuoteRequestPersistenceError;
    expect(sanitized.sqlState).toBe("23505");
    expect(sanitized.cause).toBeUndefined();
    const exposed = `${sanitized.message}\n${sanitized.stack ?? ""}`;
    for (const secret of [
      "Joao",
      "joao@example.com",
      "5511999998888",
      "leao",
      "Failed query",
      "params",
    ]) {
      expect(exposed).not.toContain(secret);
    }
  });

  it("keeps sqlState undefined when no SQLSTATE is found", async () => {
    const admin = {
      transaction: jest.fn().mockRejectedValue(new Error("boom")),
    } as unknown as DrizzleDB;
    const error = await new DrizzleQuoteRequestRepository(
      {} as DrizzleDB,
      admin,
    )
      .createWithImagesAsAdmin(request, [])
      .catch((e: unknown) => e);
    expect((error as QuoteRequestPersistenceError).sqlState).toBeUndefined();
  });
});

const dialect = new PgDialect();

// Renderiza a condicao WHERE capturada (SQL em minusculas + params).
function render(condition: SQL | undefined): { sql: string; params: unknown[] } {
  if (!condition) throw new Error("where nao foi chamado");
  const query = dialect.sqlToQuery(condition);
  return { sql: query.sql.toLowerCase(), params: query.params };
}

interface Fake {
  db: DrizzleDB;
  wheres: Array<SQL | undefined>;
  joins: Array<SQL | undefined>;
  chain: {
    limit: jest.Mock;
    offset: jest.Mock;
    orderBy: jest.Mock;
    groupBy: jest.Mock;
    set: jest.Mock;
  };
}

// Fake encadeado: cada select()/update() consome o proximo resultado da fila.
// `where` devolve um objeto aguardavel (Promise) que tambem encadeia
// orderBy/limit/offset/groupBy, entao qualquer ponto pode ser o terminal.
function buildFakeDb(results: unknown[][]): Fake {
  const queue = [...results];
  const wheres: Array<SQL | undefined> = [];
  const joins: Array<SQL | undefined> = [];
  const chain = {
    limit: jest.fn(),
    offset: jest.fn(),
    orderBy: jest.fn(),
    groupBy: jest.fn(),
    set: jest.fn(),
  };
  function start(): Record<string, unknown> {
    const result = queue.shift() ?? [];
    const terminal = Object.assign(Promise.resolve(result), {
      limit: chain.limit,
      offset: chain.offset,
      orderBy: chain.orderBy,
      groupBy: chain.groupBy,
    });
    chain.limit.mockReturnValue(terminal);
    chain.offset.mockReturnValue(terminal);
    chain.orderBy.mockReturnValue(terminal);
    chain.groupBy.mockReturnValue(terminal);
    const builder: Record<string, unknown> = {
      from: jest.fn(() => builder),
      leftJoin: jest.fn((_table: unknown, on: SQL | undefined) => {
        joins.push(on);
        return builder;
      }),
      where: jest.fn((condition: SQL | undefined) => {
        wheres.push(condition);
        return terminal;
      }),
      set: chain.set.mockImplementation(() => builder),
    };
    return builder;
  }
  const db = {
    select: jest.fn(() => start()),
    update: jest.fn(() => start()),
  } as unknown as DrizzleDB;
  return { db, wheres, joins, chain };
}

const ALL = { kind: "all" } as const;
const OWN = { kind: "own", userId: "user-1" } as const;
const VIEWED_AT = new Date("2026-10-02T10:00:00Z");

function buildListRow(id: string) {
  return {
    id,
    targetUserId: "user-1",
    targetDisplayName: "Maria Tattoo",
    requesterName: "Joao Cliente",
    idea: "Um leao",
    status: "new",
    viewedAt: null,
    createdAt: new Date("2026-10-01T00:00:00Z"),
    expiresAt: new Date("2026-10-31T00:00:00Z"),
  };
}

describe("DrizzleQuoteRequestRepository (leitura da caixa de entrada)", () => {
  describe("listForViewer", () => {
    it("owner: filtra so por org, pagina e junta a contagem de imagens", async () => {
      const { db, wheres, joins, chain } = buildFakeDb([
        [buildListRow("r-1"), buildListRow("r-2")],
        [{ total: 2 }],
        [{ quoteRequestId: "r-1", total: 3 }],
      ]);
      const repo = new DrizzleQuoteRequestRepository(db, {} as DrizzleDB);

      const page = await repo.listForViewer("org-1", ALL, {
        limit: 20,
        offset: 40,
        unreadOnly: false,
      });

      const { sql, params } = render(wheres[0]);
      expect(sql).toContain('"org_id" =');
      expect(sql).not.toContain("target_user_id");
      expect(sql).not.toContain("viewed_at");
      expect(sql).toContain('"expires_at" > now()');
      expect(params).toEqual(["org-1"]);
      const join = render(joins[0]);
      expect(join.sql).toContain('"quote_forms"."org_id" = "quote_requests"."org_id"');
      expect(join.sql).toContain(
        '"quote_forms"."user_id" = "quote_requests"."target_user_id"',
      );
      expect(page.items[0]?.targetDisplayName).toBe("Maria Tattoo");
      expect(chain.limit).toHaveBeenCalledWith(20);
      expect(chain.offset).toHaveBeenCalledWith(40);
      const imagesWhere = render(wheres[2]);
      expect(imagesWhere.sql).toContain('"quote_request_images"."org_id" =');
      expect(imagesWhere.params).toEqual(
        expect.arrayContaining(["org-1", "r-1", "r-2"]),
      );
      expect(page.total).toBe(2);
      expect(page.items.map((i) => [i.id, i.imageCount])).toEqual([
        ["r-1", 3],
        ["r-2", 0],
      ]);
    });

    it("funcionario: restringe a target_user_id; unreadOnly exige viewed_at nulo", async () => {
      const { db, wheres } = buildFakeDb([[buildListRow("r-1")], [{ total: 1 }], []]);
      const repo = new DrizzleQuoteRequestRepository(db, {} as DrizzleDB);

      await repo.listForViewer("org-1", OWN, {
        limit: 10,
        offset: 0,
        unreadOnly: true,
      });

      const { sql, params } = render(wheres[0]);
      expect(sql).toContain('"org_id" =');
      expect(sql).toContain('"target_user_id" =');
      expect(sql).toContain('"viewed_at" is null');
      expect(params).toEqual(["org-1", "user-1"]);
      // O total usa o MESMO filtro da pagina.
      expect(render(wheres[1])).toEqual(render(wheres[0]));
    });

    it("lista vazia: nao consulta imagens", async () => {
      const { db, wheres } = buildFakeDb([[], [{ total: 0 }]]);
      const repo = new DrizzleQuoteRequestRepository(db, {} as DrizzleDB);

      const page = await repo.listForViewer("org-1", ALL, {
        limit: 20,
        offset: 0,
        unreadOnly: false,
      });

      expect(page).toEqual({ items: [], total: 0 });
      expect(wheres).toHaveLength(2);
    });
  });

  describe("countUnreadForViewer", () => {
    it("conta so nao vistos no escopo do funcionario", async () => {
      const { db, wheres } = buildFakeDb([[{ total: 4 }]]);
      const repo = new DrizzleQuoteRequestRepository(db, {} as DrizzleDB);

      await expect(repo.countUnreadForViewer("org-1", OWN)).resolves.toBe(4);

      const { sql, params } = render(wheres[0]);
      expect(sql).toContain('"target_user_id" =');
      expect(sql).toContain('"viewed_at" is null');
      expect(params).toEqual(["org-1", "user-1"]);
    });
  });

  describe("findDetailForViewer", () => {
    it("filtra por org, escopo e id; devolve imagens ordenadas", async () => {
      const { db, wheres, joins, chain } = buildFakeDb([
        [{ ...buildListRow("r-1"), requesterPhone: "+5511999998888", requesterEmail: "j@e.com", contactRetentionConsentAcceptedAt: null }],
        [{ id: "i-1", storagePath: "org-1/r-1/a", contentType: "image/png", sizeBytes: 10, position: 0 }],
      ]);
      const repo = new DrizzleQuoteRequestRepository(db, {} as DrizzleDB);

      const detail = await repo.findDetailForViewer("org-1", OWN, "r-1");

      const { sql, params } = render(wheres[0]);
      expect(sql).toContain('"target_user_id" =');
      expect(sql).toContain('"id" =');
      expect(params).toEqual(["org-1", "user-1", "r-1"]);
      expect(render(joins[0]).sql).toContain(
        '"quote_forms"."user_id" = "quote_requests"."target_user_id"',
      );
      expect(detail?.targetDisplayName).toBe("Maria Tattoo");
      expect(chain.limit).toHaveBeenCalledWith(1);
      expect(chain.orderBy).toHaveBeenCalledTimes(1);
      expect(detail?.images).toHaveLength(1);
    });

    it("retorna null (sem consultar imagens) quando fora do escopo/inexistente", async () => {
      const { db, wheres } = buildFakeDb([[]]);
      const repo = new DrizzleQuoteRequestRepository(db, {} as DrizzleDB);

      await expect(
        repo.findDetailForViewer("org-1", OWN, "r-x"),
      ).resolves.toBeNull();
      expect(wheres).toHaveLength(1);
    });
  });

  describe("markViewed", () => {
    it("seta SOMENTE viewedAt e apenas quando ainda nulo", async () => {
      const { db, wheres, chain } = buildFakeDb([[]]);
      const repo = new DrizzleQuoteRequestRepository(db, {} as DrizzleDB);

      await repo.markViewed("org-1", OWN, "r-1", VIEWED_AT);

      expect(chain.set).toHaveBeenCalledWith({ viewedAt: VIEWED_AT });
      const { sql, params } = render(wheres[0]);
      expect(sql).toContain('"id" =');
      expect(sql).toContain('"target_user_id" =');
      expect(sql).toContain('"viewed_at" is null');
      expect(params).toEqual(["org-1", "user-1", "r-1"]);
    });
  });

  it("sanitiza erros de leitura (sem PII, sql, params ou cause)", async () => {
    const db = {
      select: jest.fn(() => {
        throw buildDrizzleLikeError();
      }),
    } as unknown as DrizzleDB;
    const repo = new DrizzleQuoteRequestRepository(db, {} as DrizzleDB);

    const error = await repo
      .countUnreadForViewer("org-1", ALL)
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(QuoteRequestPersistenceError);
    const sanitized = error as QuoteRequestPersistenceError;
    expect(sanitized.sqlState).toBe("23505");
    expect(sanitized.cause).toBeUndefined();
    expect(`${sanitized.message}\n${sanitized.stack ?? ""}`).not.toContain(
      "joao@example.com",
    );
  });
});
