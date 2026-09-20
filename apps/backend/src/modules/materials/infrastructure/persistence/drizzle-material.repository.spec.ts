import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import type { DrizzleDB } from "../../../../database/database.module";
import { DrizzleMaterialRepository } from "./drizzle-material.repository";

// Fake encadeado de `select().from().where().orderBy()` que captura o `where`.
function buildSelectDb(): { db: DrizzleDB; where: jest.Mock } {
  const orderBy = jest.fn().mockResolvedValue([]);
  const where = jest.fn().mockReturnValue({ orderBy });
  const from = jest.fn().mockReturnValue({ where });
  const select = jest.fn().mockReturnValue({ from });
  return { db: { select } as unknown as DrizzleDB, where };
}

describe("DrizzleMaterialRepository.findAllByOrg", () => {
  it("lowStockOnly exige minimo > 0 (nao casa minimo = 0) e estoque <= minimo", async () => {
    const { db, where } = buildSelectDb();
    const repo = new DrizzleMaterialRepository(db);

    await repo.findAllByOrg("org-1", { lowStockOnly: true });

    const condition = where.mock.calls[0]?.[0] as SQL;
    const { sql: text } = new PgDialect().sqlToQuery(condition);
    expect(text).toContain('"materials"."stock_quantity" <= "materials"."minimum_quantity"');
    expect(text).toContain('"materials"."minimum_quantity" > \'0\'::numeric');
  });

  it("sem lowStockOnly nao aplica o filtro de estoque baixo", async () => {
    const { db, where } = buildSelectDb();
    const repo = new DrizzleMaterialRepository(db);

    await repo.findAllByOrg("org-1");

    const condition = where.mock.calls[0]?.[0] as SQL;
    const { sql: text } = new PgDialect().sqlToQuery(condition);
    expect(text).not.toContain("minimum_quantity");
  });
});
