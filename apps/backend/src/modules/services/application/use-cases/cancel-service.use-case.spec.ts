import { CancelServiceUseCase } from "./cancel-service.use-case";
import { IServiceRepository } from "../../domain/service.repository.interface";
import { ServiceEntity } from "../../domain/service.entity";
import { ServiceMaterialEntity } from "../../domain/service-material.entity";
import { IMemberRepository } from "../../../organizations/domain/member.repository.interface";
import { MemberEntity } from "../../../organizations/domain/member.entity";
import { IMaterialRepository } from "../../../materials/domain/material.repository.interface";
import { IStockMovementRepository } from "../../../materials/domain/stock-movement.repository.interface";
import { ITransactionRepository } from "../../../cashier/domain/transaction.repository.interface";
import { TransactionEntity } from "../../../cashier/domain/transaction.entity";
import { ITransactionCategoryRepository } from "../../../cashier/domain/transaction-category.repository.interface";
import { TransactionCategoryEntity } from "../../../cashier/domain/transaction-category.entity";
import { ServiceNotFoundException } from "../../domain/exceptions/service-not-found.exception";
import { ServiceAlreadyCanceledException } from "../../domain/exceptions/service-already-canceled.exception";
import { ServiceForbiddenException } from "../../domain/exceptions/service-forbidden.exception";

function buildService(
  overrides: Partial<Parameters<typeof ServiceEntity.create>[0]> = {},
): ServiceEntity {
  return ServiceEntity.create({
    id: "service-1",
    orgId: "org-1",
    serviceTypeId: null,
    customerId: null,
    paymentTransactionId: "tx-1",
    anamnesisResponseId: null,
    performedBy: "user-1",
    createdBy: "user-1",
    description: null,
    amountCents: 10000,
    paymentMethod: "cash",
    commissionConfigId: null,
    commissionPercent: null,
    commissionMode: null,
    commissionBaseCents: 0,
    commissionCents: 0,
    performedAt: new Date("2026-07-01T10:00:00Z"),
    canceledAt: null,
    createdAt: new Date("2026-07-01T10:00:00Z"),
    updatedAt: new Date("2026-07-01T10:00:00Z"),
    materials: [],
    ...overrides,
  });
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
    userName: "Owner",
    userEmail: "owner@example.com",
    joinedAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  });
}

function buildTransaction(
  overrides: Partial<Parameters<typeof TransactionEntity.create>[0]> = {},
): TransactionEntity {
  return TransactionEntity.create({
    id: "tx-1",
    orgId: "org-1",
    createdBy: "user-original",
    description: "Tatuagem braço",
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

function buildFakeServiceRepo(
  overrides: Partial<jest.Mocked<IServiceRepository>> = {},
): jest.Mocked<IServiceRepository> {
  return {
    create: jest.fn(),
    findById: jest.fn(),
    findAllByOrg: jest.fn(),
    setPaymentTransaction: jest.fn(),
    existsByPaymentTransactionId: jest.fn(),
    markCanceled: jest.fn(),
    correctPayment: jest.fn(),
    update: jest.fn(),
    materialCostCentsByPeriod: jest.fn(),
    countAndRevenueByType: jest.fn(),
    countAndRevenueByProfessional: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<IServiceRepository>;
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
    setEnabled: jest.fn(),
    countActiveOwners: jest.fn(),
    countOwnedOrgs: jest.fn(),
    removeAllByUserId: jest.fn(),
    transferOwnership: jest.fn(),
    remove: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<IMemberRepository>;
}

function buildFakeMaterialRepo(
  overrides: Partial<jest.Mocked<IMaterialRepository>> = {},
): jest.Mocked<IMaterialRepository> {
  return {
    findById: jest.fn(),
    findAllByOrg: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateStockQuantity: jest.fn(),
    touchLastUsed: jest.fn(),
    setArchived: jest.fn(),
    isLinkedToService: jest.fn(),
    delete: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<IMaterialRepository>;
}

function buildFakeMovementRepo(
  overrides: Partial<jest.Mocked<IStockMovementRepository>> = {},
): jest.Mocked<IStockMovementRepository> {
  return {
    findAllByMaterial: jest.fn(),
    create: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<IStockMovementRepository>;
}

function buildFakeTransactionRepo(
  overrides: Partial<jest.Mocked<ITransactionRepository>> = {},
): jest.Mocked<ITransactionRepository> {
  return {
    create: jest.fn(),
    findById: jest.fn(),
    findAllByOrg: jest.fn(),
    findReversalOf: jest.fn().mockResolvedValue(null),
    findReversedIds: jest.fn(),
    balance: jest.fn(),
    dailyBalanceHistory: jest.fn(),
    incomeByPaymentMethod: jest.fn(),
    incomeExpenseSeries: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<ITransactionRepository>;
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

interface Fakes {
  serviceRepo: jest.Mocked<IServiceRepository>;
  memberRepo: jest.Mocked<IMemberRepository>;
  materialRepo: jest.Mocked<IMaterialRepository>;
  movementRepo: jest.Mocked<IStockMovementRepository>;
  transactionRepo: jest.Mocked<ITransactionRepository>;
  categoryRepo: jest.Mocked<ITransactionCategoryRepository>;
}

function buildUseCase(overrides: Partial<Fakes> = {}) {
  const fakes: Fakes = {
    serviceRepo: buildFakeServiceRepo(),
    memberRepo: buildFakeMemberRepo(),
    materialRepo: buildFakeMaterialRepo(),
    movementRepo: buildFakeMovementRepo(),
    transactionRepo: buildFakeTransactionRepo(),
    categoryRepo: buildFakeCategoryRepo(),
    ...overrides,
  };
  const useCase = new CancelServiceUseCase(
    fakes.serviceRepo,
    fakes.memberRepo,
    fakes.materialRepo,
    fakes.movementRepo,
    fakes.transactionRepo,
    fakes.categoryRepo,
  );
  return { useCase, ...fakes };
}

const baseInput = {
  orgId: "org-1",
  serviceId: "service-1",
  authId: "auth-1",
};

describe("CancelServiceUseCase", () => {
  it("cancela o serviço e gera estorno da transação de pagamento com a categoria de estorno", async () => {
    const service = buildService({ paymentTransactionId: "tx-1" });
    const canceledService = buildService({ canceledAt: new Date() });
    const original = buildTransaction({ id: "tx-1" });

    const { useCase, transactionRepo, categoryRepo } = buildUseCase({
      serviceRepo: buildFakeServiceRepo({
        findById: jest
          .fn()
          .mockResolvedValueOnce(service)
          .mockResolvedValueOnce(canceledService),
      }),
      transactionRepo: buildFakeTransactionRepo({
        findById: jest.fn().mockResolvedValue(original),
        findReversalOf: jest.fn().mockResolvedValue(null),
      }),
    });

    await useCase.execute(baseInput);

    expect(categoryRepo.findBySystemKey).toHaveBeenCalledWith(
      "org-1",
      "reversal",
    );
    expect(transactionRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        reversesTransactionId: original.id,
        categoryId: "cat-estorno",
      }),
    );
  });

  it("degrada para categoryId null quando a categoria de estorno não existe, sem falhar", async () => {
    const service = buildService({ paymentTransactionId: "tx-1" });
    const canceledService = buildService({ canceledAt: new Date() });
    const original = buildTransaction({ id: "tx-1" });

    const { useCase, transactionRepo } = buildUseCase({
      serviceRepo: buildFakeServiceRepo({
        findById: jest
          .fn()
          .mockResolvedValueOnce(service)
          .mockResolvedValueOnce(canceledService),
      }),
      transactionRepo: buildFakeTransactionRepo({
        findById: jest.fn().mockResolvedValue(original),
        findReversalOf: jest.fn().mockResolvedValue(null),
      }),
      categoryRepo: buildFakeCategoryRepo({
        findBySystemKey: jest.fn().mockResolvedValue(null),
      }),
    });

    const result = await useCase.execute(baseInput);

    expect(transactionRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ categoryId: null }),
    );
    expect(result).toBe(canceledService);
  });

  it("não cria transação de estorno quando o serviço não tem paymentTransactionId", async () => {
    const service = buildService({ paymentTransactionId: null });
    const canceledService = buildService({
      paymentTransactionId: null,
      canceledAt: new Date(),
    });

    const { useCase, transactionRepo, categoryRepo } = buildUseCase({
      serviceRepo: buildFakeServiceRepo({
        findById: jest
          .fn()
          .mockResolvedValueOnce(service)
          .mockResolvedValueOnce(canceledService),
      }),
    });

    await useCase.execute(baseInput);

    expect(transactionRepo.create).not.toHaveBeenCalled();
    expect(categoryRepo.findBySystemKey).not.toHaveBeenCalled();
  });

  it("lança ServiceNotFoundException quando o serviço não existe", async () => {
    const { useCase } = buildUseCase({
      serviceRepo: buildFakeServiceRepo({
        findById: jest.fn().mockResolvedValue(null),
      }),
    });

    await expect(useCase.execute(baseInput)).rejects.toBeInstanceOf(
      ServiceNotFoundException,
    );
  });

  it("lança ServiceAlreadyCanceledException quando o serviço já está cancelado", async () => {
    const canceled = buildService({ canceledAt: new Date() });
    const { useCase, transactionRepo } = buildUseCase({
      serviceRepo: buildFakeServiceRepo({
        findById: jest.fn().mockResolvedValue(canceled),
      }),
    });

    await expect(useCase.execute(baseInput)).rejects.toBeInstanceOf(
      ServiceAlreadyCanceledException,
    );
    expect(transactionRepo.create).not.toHaveBeenCalled();
  });

  it("lança ServiceForbiddenException quando o ator não é owner nem o profissional que realizou o serviço", async () => {
    const service = buildService({ performedBy: "user-other" });
    const { useCase, transactionRepo } = buildUseCase({
      memberRepo: buildFakeMemberRepo({
        findByAuthId: jest
          .fn()
          .mockResolvedValue(buildMember({ role: "employee", userId: "user-1" })),
      }),
      serviceRepo: buildFakeServiceRepo({
        findById: jest.fn().mockResolvedValue(service),
      }),
    });

    await expect(useCase.execute(baseInput)).rejects.toBeInstanceOf(
      ServiceForbiddenException,
    );
    expect(transactionRepo.create).not.toHaveBeenCalled();
  });

  it("devolve material ao estoque para cada linha do serviço", async () => {
    const line = ServiceMaterialEntity.create({
      id: "sm-1",
      serviceId: "service-1",
      materialId: "material-1",
      quantity: "2",
    });
    const service = buildService({ paymentTransactionId: null, materials: [line] });
    const canceledService = buildService({
      paymentTransactionId: null,
      canceledAt: new Date(),
      materials: [line],
    });

    const { useCase, materialRepo, movementRepo } = buildUseCase({
      serviceRepo: buildFakeServiceRepo({
        findById: jest
          .fn()
          .mockResolvedValueOnce(service)
          .mockResolvedValueOnce(canceledService),
      }),
    });

    await useCase.execute(baseInput);

    expect(materialRepo.updateStockQuantity).toHaveBeenCalledWith(
      "material-1",
      "2",
    );
    expect(movementRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        materialId: "material-1",
        quantityDelta: "2",
        serviceId: "service-1",
      }),
    );
  });
});
