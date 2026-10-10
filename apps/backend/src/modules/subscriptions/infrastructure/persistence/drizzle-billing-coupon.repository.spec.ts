import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import type { DrizzleDB } from "../../../../database/database.module";
import { BillingCouponCodeAlreadyExistsException } from "../../domain/exceptions/billing-coupon-code-already-exists.exception";
import { DrizzleBillingCouponRepository } from "./drizzle-billing-coupon.repository";

const ACTIVE_CODE_INDEX = "billing_coupons_code_active_unique";

const couponRow = {
  id: "coupon-row-1",
  stripeCouponId: "coupon_1",
  stripePromotionCodeId: "promo_1",
  code: "PROMO10",
  name: "Promo 10%",
  percentOff: 10,
  amountOffCents: null,
  currency: null,
  duration: "once",
  durationInMonths: null,
  maxRedemptions: null,
  timesRedeemed: 0,
  expiresAt: null,
  active: true,
  createdBy: null,
  lastSyncedAt: null,
  createdAt: new Date("2026-09-01T00:00:00Z"),
  updatedAt: new Date("2026-09-01T00:00:00Z"),
};

const createData = {
  stripeCouponId: "coupon_2",
  stripePromotionCodeId: "promo_2",
  code: "promo10",
  name: "Promo 10%",
  percentOff: 10,
  duration: "once",
};

// select().from().where().limit() — captura o `where`.
function buildSelectDb(rows: unknown[]): { db: DrizzleDB; where: jest.Mock } {
  const limit = jest.fn().mockResolvedValue(rows);
  const where = jest.fn().mockReturnValue({ limit });
  const from = jest.fn().mockReturnValue({ where });
  const select = jest.fn().mockReturnValue({ from });
  return { db: { select } as unknown as DrizzleDB, where };
}

// Fake cujo `.returning()` final rejeita com `error`, para insert (com ou sem
// onConflictDoUpdate) e update.
function buildFailingWriteDb(error: unknown): DrizzleDB {
  const returning = jest.fn().mockRejectedValue(error);
  const where = jest.fn().mockReturnValue({ returning });
  const set = jest.fn().mockReturnValue({ where });
  const onConflictDoUpdate = jest.fn().mockReturnValue({ returning });
  const values = jest.fn().mockReturnValue({ returning, onConflictDoUpdate });
  return {
    insert: jest.fn().mockReturnValue({ values }),
    update: jest.fn().mockReturnValue({ set }),
  } as unknown as DrizzleDB;
}

describe("DrizzleBillingCouponRepository", () => {
  describe("findByCode", () => {
    it("considera apenas a linha ATIVA e normaliza o código para maiúsculas", async () => {
      const { db, where } = buildSelectDb([couponRow]);
      const repo = new DrizzleBillingCouponRepository(db);

      const result = await repo.findByCode("promo10");

      expect(result?.id).toBe("coupon-row-1");
      const condition = where.mock.calls[0]?.[0] as SQL;
      const { sql: text, params } = new PgDialect().sqlToQuery(condition);
      expect(text).toContain('"billing_coupons"."code" = $1');
      expect(text).toContain('"billing_coupons"."active" = $2');
      expect(params).toEqual(["PROMO10", true]);
    });

    it("retorna null quando não há linha ativa com o código", async () => {
      const { db } = buildSelectDb([]);
      const repo = new DrizzleBillingCouponRepository(db);

      await expect(repo.findByCode("PROMO10")).resolves.toBeNull();
    });
  });

  describe("violação do índice parcial de código ativo (23505)", () => {
    const pgError = { code: "23505", constraint: ACTIVE_CODE_INDEX };
    const wrapped = Object.assign(new Error("query failed"), {
      cause: pgError,
    });

    it.each([
      ["direto", pgError],
      ["embrulhado em cause", wrapped],
    ])(
      "create/upsertFromStripe/update mapeiam o erro %s para BillingCouponCodeAlreadyExistsException",
      async (_label, error) => {
        const repo = new DrizzleBillingCouponRepository(
          buildFailingWriteDb(error),
        );

        await expect(repo.create(createData)).rejects.toBeInstanceOf(
          BillingCouponCodeAlreadyExistsException,
        );
        await expect(repo.upsertFromStripe(createData)).rejects.toBeInstanceOf(
          BillingCouponCodeAlreadyExistsException,
        );
        await expect(
          repo.update("coupon-row-1", { active: true }),
        ).rejects.toBeInstanceOf(BillingCouponCodeAlreadyExistsException);
      },
    );

    it("NÃO mascara outros erros: 23505 de outra constraint e erros genéricos propagam", async () => {
      const otherUnique = {
        code: "23505",
        constraint: "billing_coupons_stripe_promotion_code_id_unique",
      };
      const repoA = new DrizzleBillingCouponRepository(
        buildFailingWriteDb(otherUnique),
      );
      await expect(repoA.upsertFromStripe(createData)).rejects.toBe(
        otherUnique,
      );

      const boom = new Error("boom");
      const repoB = new DrizzleBillingCouponRepository(
        buildFailingWriteDb(boom),
      );
      await expect(repoB.create(createData)).rejects.toBe(boom);
    });
  });
});
