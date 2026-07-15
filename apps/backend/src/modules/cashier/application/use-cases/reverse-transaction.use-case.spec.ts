import { ReverseTransactionUseCase } from "./reverse-transaction.use-case";
import { ITransactionRepository } from "../../domain/transaction.repository.interface";
import { TransactionEntity } from "../../domain/transaction.entity";
import { TransactionNotFoundException } from "../../domain/exceptions/transaction-not-found.exception";
import { TransactionAlreadyReversedException } from "../../domain/exceptions/transaction-already-reversed.exception";
import { TransactionNotReversibleException } from "../../domain/exceptions/transaction-not-reversible.exception";

function buildTransaction(
  overrides: Partial<Parameters<typeof TransactionEntity.create>[0]> = {},
): TransactionEntity {
  return TransactionEntity.create({
    id: "tx-1",
    orgId: "org-1",
    createdBy: "user-1",
    description: "Venda balcão",
    type: "income",
    netCents: 10000,
    grossCents: 10000,
    feeCents: 0,
    paymentMethod: "cash",
    categoryId: null,
    reversesTransactionId: null,
    transactedAt: new Date("2026-07-01T10:00:00Z"),
    createdAt: new Date("2026-07-01T10:00:00Z"),
    ...overrides,
  });
}

function buildFakeRepo(
  overrides: Partial<jest.Mocked<ITransactionRepository>> = {},
): jest.Mocked<ITransactionRepository> {
  return {
    create: jest.fn(),
    findById: jest.fn(),
    findAllByOrg: jest.fn(),
    findReversalOf: jest.fn(),
    findReversedIds: jest.fn(),
    balance: jest.fn(),
    dailyBalanceHistory: jest.fn(),
    incomeByPaymentMethod: jest.fn(),
    incomeExpenseSeries: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<ITransactionRepository>;
}

describe("ReverseTransactionUseCase", () => {
  it("cria a linha de estorno com tipo invertido e vínculo com a original", async () => {
    const original = buildTransaction();
    const reversal = buildTransaction({
      id: "tx-2",
      type: "outcome",
      description: "Estorno: Venda balcão",
      reversesTransactionId: original.id,
    });
    const repo = buildFakeRepo({
      findById: jest.fn().mockResolvedValue(original),
      findReversalOf: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue(reversal),
    });
    const useCase = new ReverseTransactionUseCase(repo);

    const result = await useCase.execute({
      orgId: "org-1",
      transactionId: original.id,
      reversedBy: "user-2",
    });

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        orgId: original.orgId,
        type: "outcome",
        reversesTransactionId: original.id,
        netCents: original.netCents,
      }),
    );
    expect(result).toBe(reversal);
  });

  it("lança TransactionNotFoundException quando a transação não existe", async () => {
    const repo = buildFakeRepo({
      findById: jest.fn().mockResolvedValue(null),
    });
    const useCase = new ReverseTransactionUseCase(repo);

    await expect(
      useCase.execute({ orgId: "org-1", transactionId: "missing" }),
    ).rejects.toBeInstanceOf(TransactionNotFoundException);
    expect(repo.create).not.toHaveBeenCalled();
  });

  it("lança TransactionNotReversibleException ao tentar estornar um estorno", async () => {
    const alreadyReversal = buildTransaction({
      reversesTransactionId: "tx-original",
    });
    const repo = buildFakeRepo({
      findById: jest.fn().mockResolvedValue(alreadyReversal),
    });
    const useCase = new ReverseTransactionUseCase(repo);

    await expect(
      useCase.execute({ orgId: "org-1", transactionId: alreadyReversal.id }),
    ).rejects.toBeInstanceOf(TransactionNotReversibleException);
    expect(repo.create).not.toHaveBeenCalled();
  });

  it("lança TransactionAlreadyReversedException quando já existe estorno", async () => {
    const original = buildTransaction();
    const repo = buildFakeRepo({
      findById: jest.fn().mockResolvedValue(original),
      findReversalOf: jest.fn().mockResolvedValue(buildTransaction({ id: "tx-2" })),
    });
    const useCase = new ReverseTransactionUseCase(repo);

    await expect(
      useCase.execute({ orgId: "org-1", transactionId: original.id }),
    ).rejects.toBeInstanceOf(TransactionAlreadyReversedException);
    expect(repo.create).not.toHaveBeenCalled();
  });
});
