import { ReverseTransactionUseCase } from "./reverse-transaction.use-case";
import { ITransactionRepository } from "../../domain/transaction.repository.interface";
import { TransactionEntity } from "../../domain/transaction.entity";
import { TransactionNotFoundException } from "../../domain/exceptions/transaction-not-found.exception";
import { TransactionAlreadyReversedException } from "../../domain/exceptions/transaction-already-reversed.exception";
import { TransactionNotReversibleException } from "../../domain/exceptions/transaction-not-reversible.exception";
import { TransactionIsServicePaymentException } from "../../domain/exceptions/transaction-is-service-payment.exception";
import { IServiceRepository } from "../../../services/domain/service.repository.interface";
import { ITransactionCategoryRepository } from "../../domain/transaction-category.repository.interface";
import { TransactionCategoryEntity } from "../../domain/transaction-category.entity";
import { IMemberRepository } from "../../../organizations/domain/member.repository.interface";
import { MemberEntity } from "../../../organizations/domain/member.entity";

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

function buildMember(
  overrides: Partial<Parameters<typeof MemberEntity.create>[0]> = {},
): MemberEntity {
  return MemberEntity.create({
    memberId: "member-1",
    orgId: "org-1",
    userId: "user-1",
    role: "owner",
    enabled: true,
    permissions: [],
    userName: "Fulano",
    userEmail: "fulano@example.com",
    joinedAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  });
}

function buildFakeMemberRepo(
  overrides: Partial<jest.Mocked<IMemberRepository>> = {},
): jest.Mocked<IMemberRepository> {
  return {
    findAllByOrg: jest.fn(),
    upsert: jest.fn(),
    findByMemberId: jest.fn(),
    findByAuthId: jest.fn().mockResolvedValue(buildMember()),
    updateRole: jest.fn(),
    updatePermissions: jest.fn(),
    updateClassification: jest.fn(),
    setEnabled: jest.fn(),
    countActiveOwners: jest.fn(),
    countOwnedOrgs: jest.fn(),
    removeAllByUserId: jest.fn(),
    transferOwnership: jest.fn(),
    remove: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<IMemberRepository>;
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

function buildCategory(
  overrides: Partial<Parameters<typeof TransactionCategoryEntity.create>[0]> = {},
): TransactionCategoryEntity {
  return TransactionCategoryEntity.create({
    id: "cat-estorno",
    orgId: "org-1",
    name: "Estorno",
    isProtected: true,
    systemKey: "reversal",
    createdAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  });
}

function buildFakeCategoryRepo(
  overrides: Partial<jest.Mocked<ITransactionCategoryRepository>> = {},
): jest.Mocked<ITransactionCategoryRepository> {
  return {
    findByOrg: jest.fn(),
    findById: jest.fn(),
    findBySystemKey: jest.fn().mockResolvedValue(buildCategory()),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<ITransactionCategoryRepository>;
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
    const serviceRepo = buildFakeServiceRepo();
    const categoryRepo = buildFakeCategoryRepo();
    const memberRepo = buildFakeMemberRepo({
      findByAuthId: jest
        .fn()
        .mockResolvedValue(buildMember({ userId: "user-2" })),
    });
    const useCase = new ReverseTransactionUseCase(
      repo,
      memberRepo,
      serviceRepo,
      categoryRepo,
    );

    const result = await useCase.execute({
      orgId: "org-1",
      transactionId: original.id,
      authId: "auth-user-2",
    });

    expect(memberRepo.findByAuthId).toHaveBeenCalledWith("org-1", "auth-user-2");
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        orgId: original.orgId,
        createdBy: "user-2",
        type: "outcome",
        reversesTransactionId: original.id,
        netCents: original.netCents,
      }),
    );
    expect(result).toBe(reversal);
  });

  it("resolve a categoria de estorno via findBySystemKey e a inclui no create", async () => {
    const original = buildTransaction();
    const reversal = buildTransaction({ id: "tx-2", type: "outcome" });
    const repo = buildFakeRepo({
      findById: jest.fn().mockResolvedValue(original),
      findReversalOf: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue(reversal),
    });
    const serviceRepo = buildFakeServiceRepo();
    const categoryRepo = buildFakeCategoryRepo({
      findBySystemKey: jest.fn().mockResolvedValue(buildCategory({ id: "cat-1" })),
    });
    const memberRepo = buildFakeMemberRepo();
    const useCase = new ReverseTransactionUseCase(
      repo,
      memberRepo,
      serviceRepo,
      categoryRepo,
    );

    await useCase.execute({
      orgId: "org-1",
      transactionId: original.id,
      authId: "auth-user-1",
    });

    expect(categoryRepo.findBySystemKey).toHaveBeenCalledWith(
      original.orgId,
      "reversal",
    );
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ categoryId: "cat-1" }),
    );
  });

  it("degrada para categoryId null sem lançar quando a categoria de estorno não existe", async () => {
    const original = buildTransaction();
    const reversal = buildTransaction({ id: "tx-2", type: "outcome" });
    const repo = buildFakeRepo({
      findById: jest.fn().mockResolvedValue(original),
      findReversalOf: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue(reversal),
    });
    const serviceRepo = buildFakeServiceRepo();
    const categoryRepo = buildFakeCategoryRepo({
      findBySystemKey: jest.fn().mockResolvedValue(null),
    });
    const memberRepo = buildFakeMemberRepo();
    const useCase = new ReverseTransactionUseCase(
      repo,
      memberRepo,
      serviceRepo,
      categoryRepo,
    );

    const result = await useCase.execute({
      orgId: "org-1",
      transactionId: original.id,
      authId: "auth-user-1",
    });

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ categoryId: null }),
    );
    expect(result).toBe(reversal);
  });

  it("lança TransactionNotFoundException quando a transação não existe", async () => {
    const repo = buildFakeRepo({
      findById: jest.fn().mockResolvedValue(null),
    });
    const serviceRepo = buildFakeServiceRepo();
    const categoryRepo = buildFakeCategoryRepo();
    const memberRepo = buildFakeMemberRepo();
    const useCase = new ReverseTransactionUseCase(
      repo,
      memberRepo,
      serviceRepo,
      categoryRepo,
    );

    await expect(
      useCase.execute({
        orgId: "org-1",
        transactionId: "missing",
        authId: "auth-x",
      }),
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
    const serviceRepo = buildFakeServiceRepo();
    const categoryRepo = buildFakeCategoryRepo();
    const memberRepo = buildFakeMemberRepo();
    const useCase = new ReverseTransactionUseCase(
      repo,
      memberRepo,
      serviceRepo,
      categoryRepo,
    );

    await expect(
      useCase.execute({
        orgId: "org-1",
        transactionId: alreadyReversal.id,
        authId: "auth-x",
      }),
    ).rejects.toBeInstanceOf(TransactionNotReversibleException);
    expect(repo.create).not.toHaveBeenCalled();
  });

  it("lança TransactionAlreadyReversedException quando já existe estorno", async () => {
    const original = buildTransaction();
    const repo = buildFakeRepo({
      findById: jest.fn().mockResolvedValue(original),
      findReversalOf: jest.fn().mockResolvedValue(buildTransaction({ id: "tx-2" })),
    });
    const serviceRepo = buildFakeServiceRepo();
    const categoryRepo = buildFakeCategoryRepo();
    const memberRepo = buildFakeMemberRepo();
    const useCase = new ReverseTransactionUseCase(
      repo,
      memberRepo,
      serviceRepo,
      categoryRepo,
    );

    await expect(
      useCase.execute({
        orgId: "org-1",
        transactionId: original.id,
        authId: "auth-x",
      }),
    ).rejects.toBeInstanceOf(TransactionAlreadyReversedException);
    expect(repo.create).not.toHaveBeenCalled();
  });

  it("lança TransactionIsServicePaymentException e não estorna quando a transação é pagamento de serviço", async () => {
    const original = buildTransaction();
    const repo = buildFakeRepo({
      findById: jest.fn().mockResolvedValue(original),
    });
    const serviceRepo = buildFakeServiceRepo({
      existsByPaymentTransactionId: jest.fn().mockResolvedValue(true),
    });
    const categoryRepo = buildFakeCategoryRepo();
    const memberRepo = buildFakeMemberRepo();
    const useCase = new ReverseTransactionUseCase(
      repo,
      memberRepo,
      serviceRepo,
      categoryRepo,
    );

    await expect(
      useCase.execute({
        orgId: "org-1",
        transactionId: original.id,
        authId: "auth-x",
      }),
    ).rejects.toBeInstanceOf(TransactionIsServicePaymentException);
    expect(repo.create).not.toHaveBeenCalled();
  });
});
