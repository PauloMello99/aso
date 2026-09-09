import { asc } from "drizzle-orm";
import { DrizzleMaterialRepository } from "./drizzle-material.repository";
import type { DrizzleDB } from "../../../../database/database.module";
import * as schema from "../../../../database/schema";
import * as likePatternUtil from "../../../../common/db/like-pattern.util";

const materialRow = {
  id: "mat-1",
  orgId: "org-1",
  categoryId: null as string | null,
  name: "Tinta preta",
  stockQuantity: "10.00",
  minimumQuantity: "2.00",
  costPerUnit: "50.00",
  shareable: false,
  lastUsedAt: null as Date | null,
  archivedAt: null as Date | null,
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-01T00:00:00Z"),
};

// Fake de DrizzleDB para `select().from().where().orderBy().limit()`, com
// suporte opcional a `.leftJoin()` entre `from` e `where` (usado pelo ramo
// com serviceTypeId de findOptionsByOrg). Segue o padrão de fake encadeado
// de drizzle-member-payment-fee.repository.spec.ts.
function buildOptionsDb(rows: unknown[]): {
  db: DrizzleDB;
  from: jest.Mock;
  leftJoin: jest.Mock;
  where: jest.Mock;
  orderBy: jest.Mock;
  limit: jest.Mock;
} {
  const limit = jest.fn().mockResolvedValue(rows);
  const orderBy = jest.fn().mockReturnValue({ limit });
  const where = jest.fn().mockReturnValue({ orderBy });
  const leftJoin = jest.fn().mockReturnValue({ where });
  const from = jest.fn().mockReturnValue({ where, leftJoin });
  const db = {
    select: jest.fn().mockReturnValue({ from }),
  } as unknown as DrizzleDB;
  return { db, from, leftJoin, where, orderBy, limit };
}

// Fake de DrizzleDB para `select().from().where().orderBy()` SEM `.limit()`
// (usado por findAllByOrg).
function buildListDb(rows: unknown[]): {
  db: DrizzleDB;
  where: jest.Mock;
  orderBy: jest.Mock;
} {
  const orderBy = jest.fn().mockResolvedValue(rows);
  const where = jest.fn().mockReturnValue({ orderBy });
  const db = {
    select: jest.fn().mockReturnValue({ from: jest.fn().mockReturnValue({ where }) }),
  } as unknown as DrizzleDB;
  return { db, where, orderBy };
}

// Fake de DrizzleDB para `select({...}).from().where()` aguardável direto
// (usado por findServiceTypeIdsByMaterials — sem orderBy/limit).
function buildAggregateDb(rows: unknown[]): {
  db: DrizzleDB;
  select: jest.Mock;
  from: jest.Mock;
  where: jest.Mock;
} {
  const where = jest.fn().mockResolvedValue(rows);
  const from = jest.fn().mockReturnValue({ where });
  const select = jest.fn().mockReturnValue({ from });
  const db = { select } as unknown as DrizzleDB;
  return { db, select, from, where };
}

describe("DrizzleMaterialRepository", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("findServiceTypeIdsByMaterials", () => {
    it("retorna {} sem consultar o banco quando materialIds está vazio", async () => {
      const { db, select } = buildAggregateDb([]);
      const repo = new DrizzleMaterialRepository(db);

      const result = await repo.findServiceTypeIdsByMaterials("org-1", []);

      expect(result).toEqual({});
      expect(select).not.toHaveBeenCalled();
    });

    it("agrega os vínculos por material numa única query, incluindo [] para material sem vínculo", async () => {
      const { db, select } = buildAggregateDb([
        { materialId: "mat-1", serviceTypeId: "svc-1" },
        { materialId: "mat-1", serviceTypeId: "svc-2" },
        { materialId: "mat-3", serviceTypeId: "svc-3" },
      ]);
      const repo = new DrizzleMaterialRepository(db);

      const result = await repo.findServiceTypeIdsByMaterials("org-1", [
        "mat-1",
        "mat-2",
        "mat-3",
      ]);

      expect(select).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        "mat-1": ["svc-1", "svc-2"],
        "mat-2": [],
        "mat-3": ["svc-3"],
      });
    });
  });

  describe("findOptionsByOrg", () => {
    it("sem serviceTypeId, ordena por name ASC, id ASC (comportamento histórico, sem leftJoin)", async () => {
      const { db, leftJoin, orderBy } = buildOptionsDb([materialRow]);
      const repo = new DrizzleMaterialRepository(db);

      await repo.findOptionsByOrg("org-1", { limit: 10 });

      expect(leftJoin).not.toHaveBeenCalled();
      expect(orderBy).toHaveBeenCalledWith(
        asc(schema.materials.name),
        asc(schema.materials.id),
      );
    });

    it("com serviceTypeId, faz leftJoin e ordena com 4 critérios (vinculado desc primeiro)", async () => {
      const { db, leftJoin, orderBy } = buildOptionsDb([materialRow]);
      const repo = new DrizzleMaterialRepository(db);

      await repo.findOptionsByOrg("org-1", {
        limit: 10,
        serviceTypeId: "service-1",
      });

      expect(leftJoin).toHaveBeenCalledTimes(1);
      expect(orderBy).toHaveBeenCalledTimes(1);
      expect(orderBy.mock.calls[0]).toHaveLength(4);
    });

    it("escapa o termo de busca via containsPattern antes do ilike", async () => {
      const spy = jest.spyOn(likePatternUtil, "containsPattern");
      const { db } = buildOptionsDb([]);
      const repo = new DrizzleMaterialRepository(db);

      await repo.findOptionsByOrg("org-1", { limit: 10, search: "100%_off" });

      expect(spy).toHaveBeenCalledWith("100%_off");
    });
  });

  describe("findAllByOrg", () => {
    it("escapa o termo do filtro name via containsPattern antes do ilike", async () => {
      const spy = jest.spyOn(likePatternUtil, "containsPattern");
      const { db } = buildListDb([]);
      const repo = new DrizzleMaterialRepository(db);

      await repo.findAllByOrg("org-1", { name: "tin_ta%" });

      expect(spy).toHaveBeenCalledWith("tin_ta%");
    });
  });
});
