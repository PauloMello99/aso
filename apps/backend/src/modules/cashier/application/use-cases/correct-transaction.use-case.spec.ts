import { CorrectTransactionUseCase } from "./correct-transaction.use-case";
import { ITransactionRepository } from "../../domain/transaction.repository.interface";
import { TransactionEntity } from "../../domain/transaction.entity";
import { TransactionNotFoundException } from "../../domain/exceptions/transaction-not-found.exception";
import { TransactionIsServicePaymentException } from "../../domain/exceptions/transaction-is-service-payment.exception";
import { IServiceRepository } from "../../../services/domain/service.repository.interface";
import { ReverseTransactionUseCase } from "./reverse-transaction.use-case";
import { CreateTransactionUseCase } from "./create-transaction.use-case";

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

function buildFakeTransactionRepo(
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

function buildFakeServiceRepo(
  overrides: Partial<jest.Mocked<IServiceRepository>> = {},
): jest.Mocked<IServiceRepository> {
  return {
    create: jest.fn(),
    findById: jest.fn(),
    findAllByOrg: jest.fn(),
    setPaymentTransaction: jest.fn(),
    existsByPaymentTransactionId: jest.fn().mockResolvedValue(false),
    markCanceled: jest.fn(),
    correctPayment: jest.fn(),
    update: jest.fn(),
    materialCostCentsByPeriod: jest.fn(),
    countAndRevenueByType: jest.fn(),
    countAndRevenueByProfessional: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<IServiceRepository>;
}

describe("CorrectTransactionUseCase", () => {
  it("estorna a original e cria o lançamento corrigido preservando a autoria", async () => {
    const original = buildTransaction();
    const reversal = buildTransaction({
      id: "tx-2",
      type: "outcome",
      description: "Estorno: Venda balcão",
      reversesTransactionId: original.id,
    });
    const replacement = buildTransaction({
      id: "tx-3",
      grossCents: 15000,
      netCents: 15000,
    });

    const transactionRepo = buildFakeTransactionRepo({
      findById: jest.fn().mockResolvedValue(original),
    });
    const serviceRepo = buildFakeServiceRepo();
    const reverseTransaction = {
      execute: jest.fn().mockResolvedValue(reversal),
    } as unknown as jest.Mocked<ReverseTransactionUseCase>;
    const createTransaction = {
      execute: jest.fn().mockResolvedValue(replacement),
    } as unknown as jest.Mocked<CreateTransactionUseCase>;

    const useCase = new CorrectTransactionUseCase(
      transactionRepo,
      serviceRepo,
      reverseTransaction,
      createTransaction,
    );

    const result = await useCase.execute({
      orgId: "org-1",
      transactionId: original.id,
      correctedBy: "user-2",
      description: "Venda balcão (corrigida)",
      type: "income",
      grossCents: 15000,
      paymentMethod: "cash",
    });

    expect(serviceRepo.existsByPaymentTransactionId).toHaveBeenCalledWith(
      original.id,
    );
    expect(reverseTransaction.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        orgId: "org-1",
        transactionId: original.id,
        authId: "user-2",
      }),
    );
    expect(createTransaction.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        trustedCreatedBy: original.createdBy,
        grossCents: 15000,
        originalFee: {
          paymentMethod: original.paymentMethod,
          feePercent: original.feePercent,
          feeFixedCents: original.feeFixedCents,
          feeSource: original.feeSource,
          feeConfigId: original.feeConfigId,
        },
      }),
    );
    expect(result).toEqual({ reversal, replacement });
  });

  it("lança TransactionNotFoundException quando a transação não existe", async () => {
    const transactionRepo = buildFakeTransactionRepo({
      findById: jest.fn().mockResolvedValue(null),
    });
    const serviceRepo = buildFakeServiceRepo();
    const reverseTransaction = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<ReverseTransactionUseCase>;
    const createTransaction = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<CreateTransactionUseCase>;

    const useCase = new CorrectTransactionUseCase(
      transactionRepo,
      serviceRepo,
      reverseTransaction,
      createTransaction,
    );

    await expect(
      useCase.execute({
        orgId: "org-1",
        transactionId: "missing",
        description: "x",
        type: "income",
        grossCents: 100,
        paymentMethod: "cash",
      }),
    ).rejects.toBeInstanceOf(TransactionNotFoundException);
    expect(reverseTransaction.execute).not.toHaveBeenCalled();
    expect(createTransaction.execute).not.toHaveBeenCalled();
  });

  it("lança TransactionIsServicePaymentException e não mexe no caixa quando a transação é pagamento de serviço", async () => {
    const original = buildTransaction();
    const transactionRepo = buildFakeTransactionRepo({
      findById: jest.fn().mockResolvedValue(original),
    });
    const serviceRepo = buildFakeServiceRepo({
      existsByPaymentTransactionId: jest.fn().mockResolvedValue(true),
    });
    const reverseTransaction = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<ReverseTransactionUseCase>;
    const createTransaction = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<CreateTransactionUseCase>;

    const useCase = new CorrectTransactionUseCase(
      transactionRepo,
      serviceRepo,
      reverseTransaction,
      createTransaction,
    );

    await expect(
      useCase.execute({
        orgId: "org-1",
        transactionId: original.id,
        description: "Venda balcão (corrigida)",
        type: "income",
        grossCents: 15000,
        paymentMethod: "cash",
      }),
    ).rejects.toBeInstanceOf(TransactionIsServicePaymentException);
    expect(reverseTransaction.execute).not.toHaveBeenCalled();
    expect(createTransaction.execute).not.toHaveBeenCalled();
  });
});
