import { DrizzleCustomerRepository } from "./drizzle-customer.repository";
import type { DrizzleDB } from "../../../../database/database.module";
import * as likePatternUtil from "../../../../common/db/like-pattern.util";

// Fake de DrizzleDB para `select().from().where().orderBy().limit()`
// (findOptionsByOrg). Segue o padrão de fake encadeado de
// drizzle-member-payment-fee.repository.spec.ts.
function buildOptionsDb(rows: unknown[]): {
  db: DrizzleDB;
  where: jest.Mock;
  orderBy: jest.Mock;
  limit: jest.Mock;
} {
  const limit = jest.fn().mockResolvedValue(rows);
  const orderBy = jest.fn().mockReturnValue({ limit });
  const where = jest.fn().mockReturnValue({ orderBy });
  const db = {
    select: jest
      .fn()
      .mockReturnValue({ from: jest.fn().mockReturnValue({ where }) }),
  } as unknown as DrizzleDB;
  return { db, where, orderBy, limit };
}

// Fake de DrizzleDB para `select().from().where().orderBy()` SEM `.limit()`
// (findAllByOrg).
function buildListDb(rows: unknown[]): {
  db: DrizzleDB;
  where: jest.Mock;
  orderBy: jest.Mock;
} {
  const orderBy = jest.fn().mockResolvedValue(rows);
  const where = jest.fn().mockReturnValue({ orderBy });
  const db = {
    select: jest
      .fn()
      .mockReturnValue({ from: jest.fn().mockReturnValue({ where }) }),
  } as unknown as DrizzleDB;
  return { db, where, orderBy };
}

describe("DrizzleCustomerRepository", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("findAllByOrg", () => {
    it("escapa o termo do filtro search via containsPattern antes do ilike", async () => {
      const spy = jest.spyOn(likePatternUtil, "containsPattern");
      const { db } = buildListDb([]);
      const repo = new DrizzleCustomerRepository(db);

      await repo.findAllByOrg("org-1", { search: "100%_off" });

      expect(spy).toHaveBeenCalledWith("100%_off");
    });
  });

  describe("findOptionsByOrg", () => {
    it("escapa o termo de busca via containsPattern antes do ilike", async () => {
      const spy = jest.spyOn(likePatternUtil, "containsPattern");
      const { db } = buildOptionsDb([]);
      const repo = new DrizzleCustomerRepository(db);

      await repo.findOptionsByOrg("org-1", { limit: 10, search: "tin_ta%" });

      expect(spy).toHaveBeenCalledWith("tin_ta%");
    });
  });
});
