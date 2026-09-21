import { DrizzlePaymentFeeRepository } from "./drizzle-payment-fee.repository";
import { TtlCache } from "../../../../common/cache/ttl-cache.service";
import * as schema from "../../../../database/schema";
import type { DrizzleDB } from "../../../../database/database.module";

const feeRow = {
  id: "pf-1",
  orgId: "org-1",
  paymentMethod: "credit_card" as const,
  percent: "5.00",
  fixedCents: 0,
  installments: 6,
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-01T00:00:00Z"),
};

// Fake de DrizzleDB para os métodos de leitura. `select().from().where()` é
// aguardável direto (findByOrg) e também expõe `.limit()` (findByOrgAndMethod).
// Segue o padrão de fake encadeado de drizzle-member-payment-fee.repository.spec.ts.
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

// Fake de DrizzleDB para `upsert`: `insert().values().onConflictDoUpdate().returning()`.
function buildUpsertDb(returned: unknown): {
  db: DrizzleDB;
  values: jest.Mock;
  onConflictDoUpdate: jest.Mock;
} {
  const returning = jest.fn().mockResolvedValue([returned]);
  const onConflictDoUpdate = jest.fn().mockReturnValue({ returning });
  const values = jest.fn().mockReturnValue({ onConflictDoUpdate });
  const insert = jest.fn().mockReturnValue({ values });
  const db = { insert } as unknown as DrizzleDB;
  return { db, values, onConflictDoUpdate };
}

describe("DrizzlePaymentFeeRepository", () => {
  describe("findByOrgAndMethod", () => {
    it("filtra por org + método + parcelas e mapeia a linha", async () => {
      const { db, limit } = buildSelectDb([feeRow]);
      const repo = new DrizzlePaymentFeeRepository(db, new TtlCache());

      const result = await repo.findByOrgAndMethod("org-1", "credit_card", 6);

      expect(limit).toHaveBeenCalledWith(1);
      expect(result?.installments).toBe(6);
    });

    it("retorna null quando a faixa não tem config", async () => {
      const { db } = buildSelectDb([]);
      const repo = new DrizzlePaymentFeeRepository(db, new TtlCache());

      const result = await repo.findByOrgAndMethod("org-1", "credit_card", 3);

      expect(result).toBeNull();
    });
  });

  describe("upsert", () => {
    it("grava installments nos values e inclui installments no target do onConflict", async () => {
      const { db, values, onConflictDoUpdate } = buildUpsertDb(feeRow);
      const repo = new DrizzlePaymentFeeRepository(db, new TtlCache());

      const result = await repo.upsert({
        orgId: "org-1",
        paymentMethod: "credit_card",
        installments: 6,
        percent: "5.00",
        fixedCents: 0,
      });

      expect(values).toHaveBeenCalledWith(
        expect.objectContaining({ installments: 6 }),
      );
      expect(onConflictDoUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          target: [
            schema.orgPaymentFees.orgId,
            schema.orgPaymentFees.paymentMethod,
            schema.orgPaymentFees.installments,
          ],
        }),
      );
      expect(result.installments).toBe(6);
    });

    // A colisão real do ON CONFLICT (upsert de 1x não sobrescrever 6x) só é
    // validada contra o banco real (ver validation_requested no handoff) — o
    // fake de DrizzleDB não roda a constraint única do Postgres.
  });
});
