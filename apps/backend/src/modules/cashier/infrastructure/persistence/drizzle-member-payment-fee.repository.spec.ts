import { DrizzleMemberPaymentFeeRepository } from "./drizzle-member-payment-fee.repository";
import type { DrizzleDB } from "../../../../database/database.module";

const feeRow = {
  id: "mpf-1",
  orgId: "org-1",
  userId: "user-1",
  paymentMethod: "credit_card" as const,
  percent: "5.00",
  fixedCents: 0,
  active: true,
  supersededAt: null as Date | null,
  createdBy: "owner-1" as string | null,
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-01T00:00:00Z"),
};

// Fake de DrizzleDB para os métodos de leitura. `select().from().where()` é
// aguardável direto (findActiveByOrg) e também expõe `.limit()`
// (findActiveByOrgUserAndMethod). Segue o padrão de fake encadeado de
// drizzle-member.repository.spec.ts, acrescentando `then` para tornar o próprio
// query builder aguardável.
function buildSelectDb(rows: unknown[]): {
  db: DrizzleDB;
  where: jest.Mock;
  limit: jest.Mock;
} {
  const limit = jest.fn().mockResolvedValue(rows);
  const where = jest.fn();
  const queryBuilder = {
    from: jest.fn().mockReturnThis(),
    where,
    limit,
    then: (resolve: (value: unknown) => unknown) => resolve(rows),
  };
  where.mockReturnValue(queryBuilder);
  const db = {
    select: jest.fn().mockReturnValue(queryBuilder),
  } as unknown as DrizzleDB;
  return { db, where, limit };
}

// Fake de DrizzleDB para `supersede`: roda o callback de `db.transaction` com um
// `tx` que registra a ordem das chamadas. O UPDATE (active=false + supersededAt)
// tem de vir ANTES do INSERT por causa do índice único parcial WHERE active.
function buildSupersedeDb(inserted: unknown): {
  db: DrizzleDB;
  transaction: jest.Mock;
  calls: string[];
  set: jest.Mock;
  values: jest.Mock;
} {
  const calls: string[] = [];
  const updateWhere = jest.fn().mockImplementation(() => {
    calls.push("update.where");
    return Promise.resolve(undefined);
  });
  const set = jest.fn().mockImplementation(() => {
    calls.push("update.set");
    return { where: updateWhere };
  });
  const update = jest.fn().mockReturnValue({ set });
  const returning = jest.fn().mockImplementation(() => {
    calls.push("insert.returning");
    return Promise.resolve([inserted]);
  });
  const values = jest.fn().mockImplementation(() => {
    calls.push("insert.values");
    return { returning };
  });
  const insert = jest.fn().mockReturnValue({ values });
  const tx = { update, insert };
  const transaction = jest
    .fn()
    .mockImplementation((cb: (arg: unknown) => unknown) => cb(tx));
  const db = { transaction } as unknown as DrizzleDB;
  return { db, transaction, calls, set, values };
}

// Fake de DrizzleDB para `deactivate`: um único `db.update().set().where()`
// aguardável direto, sem transação. Espelha o encadeamento de `supersede` mas
// sem `insert`/`transaction`.
function buildDeactivateDb(): {
  db: DrizzleDB;
  update: jest.Mock;
  set: jest.Mock;
  where: jest.Mock;
  transaction: jest.Mock;
} {
  const where = jest.fn().mockResolvedValue(undefined);
  const set = jest.fn().mockReturnValue({ where });
  const update = jest.fn().mockReturnValue({ set });
  const transaction = jest.fn();
  const db = { update, transaction } as unknown as DrizzleDB;
  return { db, update, set, where, transaction };
}

describe("DrizzleMemberPaymentFeeRepository", () => {
  describe("deactivate", () => {
    it("faz UPDATE active=false + supersededAt/updatedAt (nunca DELETE) e não abre transação", async () => {
      const { db, update, set, where, transaction } = buildDeactivateDb();
      const repo = new DrizzleMemberPaymentFeeRepository(db);

      await repo.deactivate("org-1", "user-1", "credit_card");

      expect(update).toHaveBeenCalledTimes(1);
      expect(set).toHaveBeenCalledWith(
        expect.objectContaining({
          active: false,
          supersededAt: expect.any(Date),
          updatedAt: expect.any(Date),
        }),
      );
      expect(where).toHaveBeenCalledTimes(1);
      expect(transaction).not.toHaveBeenCalled();
    });
  });

  describe("supersede", () => {
    it("desativa a linha ativa (active=false + supersededAt) ANTES de inserir a nova, na mesma db.transaction", async () => {
      const { db, transaction, calls, set, values } = buildSupersedeDb({
        ...feeRow,
        id: "mpf-2",
        percent: "7.00",
      });
      const repo = new DrizzleMemberPaymentFeeRepository(db);

      const result = await repo.supersede({
        orgId: "org-1",
        userId: "user-1",
        paymentMethod: "credit_card",
        percent: "7.00",
        fixedCents: 0,
        createdBy: "owner-1",
      });

      expect(transaction).toHaveBeenCalledTimes(1);
      expect(set).toHaveBeenCalledWith(
        expect.objectContaining({
          active: false,
          supersededAt: expect.any(Date),
          updatedAt: expect.any(Date),
        }),
      );
      expect(values).toHaveBeenCalledWith(
        expect.objectContaining({ active: true, createdBy: "owner-1" }),
      );
      // O UPDATE inteiro precede o INSERT.
      expect(calls).toEqual([
        "update.set",
        "update.where",
        "insert.values",
        "insert.returning",
      ]);
      expect(result.id).toBe("mpf-2");
      expect(result.percent).toBe("7.00");
    });
  });

  describe("findActiveByOrgUserAndMethod", () => {
    it("filtra por org + user + método + active=true, limita a 1 e mapeia a linha", async () => {
      const { db, limit } = buildSelectDb([feeRow]);
      const repo = new DrizzleMemberPaymentFeeRepository(db);

      const result = await repo.findActiveByOrgUserAndMethod(
        "org-1",
        "user-1",
        "credit_card",
      );

      expect(limit).toHaveBeenCalledWith(1);
      expect(result?.id).toBe("mpf-1");
      expect(result?.active).toBe(true);
      expect(result?.paymentMethod).toBe("credit_card");
    });

    it("retorna null quando não há linha ativa", async () => {
      const { db } = buildSelectDb([]);
      const repo = new DrizzleMemberPaymentFeeRepository(db);

      const result = await repo.findActiveByOrgUserAndMethod(
        "org-1",
        "user-1",
        "credit_card",
      );

      expect(result).toBeNull();
    });
  });

  describe("findActiveByOrg", () => {
    it("retorna todas as linhas ativas da org já mapeadas", async () => {
      const { db } = buildSelectDb([feeRow, { ...feeRow, id: "mpf-2" }]);
      const repo = new DrizzleMemberPaymentFeeRepository(db);

      const result = await repo.findActiveByOrg("org-1");

      expect(result).toHaveLength(2);
      expect(result.map((f) => f.id)).toEqual(["mpf-1", "mpf-2"]);
      expect(result.every((f) => f.active)).toBe(true);
    });
  });
});
