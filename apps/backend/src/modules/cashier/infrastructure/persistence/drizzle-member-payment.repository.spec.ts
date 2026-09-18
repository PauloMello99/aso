import { DrizzleMemberPaymentRepository } from "./drizzle-member-payment.repository";
import type { DrizzleDB } from "../../../../database/database.module";

const paymentRow = {
  id: "mp-1",
  orgId: "org-1",
  userId: "user-1",
  transactionId: "txn-1",
  amountCents: 5000,
  periodStart: "2026-08-01" as string | null,
  periodEnd: "2026-08-31" as string | null,
  description: null as string | null,
  reversesPaymentId: null as string | null,
  createdBy: "owner-1" as string | null,
  createdAt: new Date("2026-09-01T00:00:00Z"),
};

// Fake de DrizzleDB para os métodos de leitura. `select().from().where()` é
// aguardável direto (findReversedIds) e também expõe `.limit()` (findById) e
// `.innerJoin()` (findAllByOrgAndUser, que agora faz JOIN com transactions
// para trazer payment_method). Segue o padrão de fake encadeado de
// drizzle-member-payment-fee.repository.spec.ts.
function buildSelectDb(rows: unknown[]): {
  db: DrizzleDB;
  select: jest.Mock;
  from: jest.Mock;
  innerJoin: jest.Mock;
  where: jest.Mock;
  limit: jest.Mock;
  orderBy: jest.Mock;
} {
  const limit = jest.fn().mockResolvedValue(rows);
  const orderBy = jest.fn().mockResolvedValue(rows);
  const where = jest.fn();
  const queryBuilder = {
    from: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    where,
    limit,
    orderBy,
    then: (resolve: (value: unknown) => unknown) => resolve(rows),
  };
  where.mockReturnValue(queryBuilder);
  const select = jest.fn().mockReturnValue(queryBuilder);
  const db = { select } as unknown as DrizzleDB;
  return {
    db,
    select,
    from: queryBuilder.from,
    innerJoin: queryBuilder.innerJoin,
    where,
    limit,
    orderBy,
  };
}

// Fake de DrizzleDB para `create`: `insert().values().returning()` aguardável,
// sem transação (é um insert único — a dupla escrita atômica com a transação
// do caixa é responsabilidade do use-case, que injeta o MESMO `DRIZZLE`).
function buildInsertDb(returned: unknown): {
  db: DrizzleDB;
  insert: jest.Mock;
  values: jest.Mock;
  returning: jest.Mock;
} {
  const returning = jest.fn().mockResolvedValue([returned]);
  const values = jest.fn().mockReturnValue({ returning });
  const insert = jest.fn().mockReturnValue({ values });
  const db = { insert } as unknown as DrizzleDB;
  return { db, insert, values, returning };
}

describe("DrizzleMemberPaymentRepository", () => {
  describe("create", () => {
    it("insere a linha e mapeia o retorno, sem abrir transação própria", async () => {
      const { db, values } = buildInsertDb(paymentRow);
      const repo = new DrizzleMemberPaymentRepository(db);

      const result = await repo.create({
        orgId: "org-1",
        userId: "user-1",
        transactionId: "txn-1",
        amountCents: 5000,
        periodStart: "2026-08-01",
        periodEnd: "2026-08-31",
        createdBy: "owner-1",
      });

      expect(values).toHaveBeenCalledWith(
        expect.objectContaining({
          orgId: "org-1",
          userId: "user-1",
          transactionId: "txn-1",
          amountCents: 5000,
          reversesPaymentId: null,
        }),
      );
      expect(result.id).toBe("mp-1");
      expect(result.amountCents).toBe(5000);
    });
  });

  describe("findById", () => {
    it("filtra por id + org, limita a 1 e mapeia a linha", async () => {
      const { db, limit } = buildSelectDb([paymentRow]);
      const repo = new DrizzleMemberPaymentRepository(db);

      const result = await repo.findById("mp-1", "org-1");

      expect(limit).toHaveBeenCalledWith(1);
      expect(result?.id).toBe("mp-1");
    });

    it("retorna null quando não encontra", async () => {
      const { db } = buildSelectDb([]);
      const repo = new DrizzleMemberPaymentRepository(db);

      const result = await repo.findById("mp-1", "org-1");

      expect(result).toBeNull();
    });
  });

  describe("findAllByOrgAndUser", () => {
    it("faz JOIN com transactions e retorna entity + paymentMethod REAL, mais recentes primeiro", async () => {
      const { db, innerJoin, orderBy } = buildSelectDb([
        { ...paymentRow, paymentMethod: "bank_transfer" },
        { ...paymentRow, id: "mp-2", paymentMethod: "cash" },
      ]);
      const repo = new DrizzleMemberPaymentRepository(db);

      const result = await repo.findAllByOrgAndUser("org-1", "user-1");

      expect(innerJoin).toHaveBeenCalledTimes(1);
      expect(orderBy).toHaveBeenCalledTimes(1);
      expect(result.map((p) => p.entity.id)).toEqual(["mp-1", "mp-2"]);
      expect(result.map((p) => p.paymentMethod)).toEqual([
        "bank_transfer",
        "cash",
      ]);
    });
  });

  describe("findReversedIds", () => {
    it("retorna o conjunto de ids que já têm estorno apontando para eles", async () => {
      const { db } = buildSelectDb([
        { reverses: "mp-1" },
        { reverses: "mp-2" },
      ]);
      const repo = new DrizzleMemberPaymentRepository(db);

      const result = await repo.findReversedIds("org-1");

      expect(result).toEqual(new Set(["mp-1", "mp-2"]));
    });

    it("retorna conjunto vazio quando nenhuma linha foi estornada", async () => {
      const { db } = buildSelectDb([]);
      const repo = new DrizzleMemberPaymentRepository(db);

      const result = await repo.findReversedIds("org-1");

      expect(result.size).toBe(0);
    });
  });

  describe("netPaidCents", () => {
    it("converte o bigint em string vindo do pg para number", async () => {
      const execute = jest.fn().mockResolvedValue({
        rows: [{ net_cents: "5000" }],
      });
      const db = { execute } as unknown as DrizzleDB;
      const repo = new DrizzleMemberPaymentRepository(db);

      const result = await repo.netPaidCents("org-1", "user-1");

      expect(result).toBe(5000);
      expect(typeof result).toBe("number");
    });

    it("retorna 0 quando não há linha nenhuma (COALESCE)", async () => {
      const execute = jest.fn().mockResolvedValue({ rows: [] });
      const db = { execute } as unknown as DrizzleDB;
      const repo = new DrizzleMemberPaymentRepository(db);

      const result = await repo.netPaidCents("org-1", "user-1");

      expect(result).toBe(0);
    });

    // A semântica da fórmula por exclusão (reverses_payment_id IS NULL +
    // NOT EXISTS) — isto é, se ela de fato soma linha não-estornada e exclui
    // o par estornado/estorno — só é validada com o banco real (ver
    // validation_requested no handoff): um mock de `db.execute` não roda SQL,
    // só confirma o contrato de conversão de tipo do resultado.
  });
});
