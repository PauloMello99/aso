import { CorrectServicePaymentUseCase } from "./correct-service-payment.use-case";
import { IServiceRepository } from "../../domain/service.repository.interface";
import { ServiceEntity } from "../../domain/service.entity";
import { IMemberRepository } from "../../../organizations/domain/member.repository.interface";
import { MemberEntity } from "../../../organizations/domain/member.entity";
import { ITransactionRepository } from "../../../cashier/domain/transaction.repository.interface";
import { TransactionEntity } from "../../../cashier/domain/transaction.entity";
import { IPaymentFeeRepository } from "../../../cashier/domain/payment-fee.repository.interface";
import { computeNet } from "../../../cashier/domain/fee-calculator";
import { ServiceNotFoundException } from "../../domain/exceptions/service-not-found.exception";
import { ServiceAlreadyCanceledException } from "../../domain/exceptions/service-already-canceled.exception";
import { ServiceForbiddenException } from "../../domain/exceptions/service-forbidden.exception";
import { ServicePaymentNotCorrectableException } from "../../domain/exceptions/service-payment-not-correctable.exception";

function buildService(
  overrides: Partial<Parameters<typeof ServiceEntity.create>[0]> = {},
): ServiceEntity {
  return ServiceEntity.create({
    id: "service-1",
    orgId: "org-1",
    serviceTypeId: null,
    customerId: null,
    paymentTransactionId: "tx-1",
    performedBy: "user-1",
    createdBy: "user-1",
    description: null,
    amountCents: 10000,
    paymentMethod: "cash",
    performedAt: new Date("2026-07-01T10:00:00Z"),
    canceledAt: null,
    createdAt: new Date("2026-07-01T10:00:00Z"),
    updatedAt: new Date("2026-07-01T10:00:00Z"),
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

function buildFakeServiceRepo(
  overrides: Partial<jest.Mocked<IServiceRepository>> = {},
): jest.Mocked<IServiceRepository> {
  return {
    create: jest.fn(),
    findById: jest.fn(),
    findAllByOrg: jest.fn(),
    setPaymentTransaction: jest.fn(),
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

function buildFakeFeeRepo(
  overrides: Partial<jest.Mocked<IPaymentFeeRepository>> = {},
): jest.Mocked<IPaymentFeeRepository> {
  return {
    findByOrg: jest.fn(),
    findByOrgAndMethod: jest.fn().mockResolvedValue(null),
    upsert: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<IPaymentFeeRepository>;
}

interface Fakes {
  serviceRepo: jest.Mocked<IServiceRepository>;
  memberRepo: jest.Mocked<IMemberRepository>;
  transactionRepo: jest.Mocked<ITransactionRepository>;
  feeRepo: jest.Mocked<IPaymentFeeRepository>;
}

function buildUseCase(overrides: Partial<Fakes> = {}) {
  const fakes: Fakes = {
    serviceRepo: buildFakeServiceRepo(),
    memberRepo: buildFakeMemberRepo(),
    transactionRepo: buildFakeTransactionRepo(),
    feeRepo: buildFakeFeeRepo(),
    ...overrides,
  };
  const useCase = new CorrectServicePaymentUseCase(
    fakes.serviceRepo,
    fakes.memberRepo,
    fakes.transactionRepo,
    fakes.feeRepo,
  );
  return { useCase, ...fakes };
}

const baseInput = {
  orgId: "org-1",
  serviceId: "service-1",
  authId: "auth-1",
  grossCents: 15000,
  paymentMethod: "credit_card" as const,
};

describe("CorrectServicePaymentUseCase", () => {
  it("estorna a transação original, lança a corrigida e atualiza o serviço com o id da nova transação", async () => {
    const service = buildService({ paymentTransactionId: "tx-1" });
    const refreshed = buildService({
      paymentTransactionId: "tx-3",
      amountCents: 15000,
      paymentMethod: "credit_card",
    });
    const original = buildTransaction({ id: "tx-1" });
    const reversal = buildTransaction({
      id: "tx-2",
      type: "outcome",
      description: "Estorno: Tatuagem braço",
      reversesTransactionId: "tx-1",
    });
    const fee = { percent: "10.00", fixedCents: 0 };
    const replacement = buildTransaction({
      id: "tx-3",
      type: "income",
      grossCents: 15000,
      paymentMethod: "credit_card",
      ...computeNet(15000, "credit_card", fee),
    });

    const { useCase, serviceRepo, transactionRepo, feeRepo } = buildUseCase({
      serviceRepo: buildFakeServiceRepo({
        findById: jest
          .fn()
          .mockResolvedValueOnce(service)
          .mockResolvedValueOnce(refreshed),
      }),
      transactionRepo: buildFakeTransactionRepo({
        findById: jest.fn().mockResolvedValue(original),
        findReversalOf: jest.fn().mockResolvedValue(null),
        create: jest
          .fn()
          .mockResolvedValueOnce(reversal)
          .mockResolvedValueOnce(replacement),
      }),
      feeRepo: buildFakeFeeRepo({
        findByOrgAndMethod: jest.fn().mockResolvedValue(fee),
      }),
    });

    const result = await useCase.execute(baseInput);

    expect(transactionRepo.create).toHaveBeenCalledTimes(2);
    expect(transactionRepo.create).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        type: "outcome",
        reversesTransactionId: original.id,
        grossCents: original.grossCents,
        feeCents: original.feeCents,
        netCents: original.netCents,
        paymentMethod: original.paymentMethod,
      }),
    );
    expect(feeRepo.findByOrgAndMethod).toHaveBeenCalledWith(
      "org-1",
      "credit_card",
    );
    const { feeCents, netCents } = computeNet(15000, "credit_card", fee);
    expect(transactionRepo.create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        orgId: "org-1",
        grossCents: 15000,
        feeCents,
        netCents,
        paymentMethod: "credit_card",
        type: "income",
      }),
    );
    expect(serviceRepo.correctPayment).toHaveBeenCalledWith(
      service.id,
      { amountCents: 15000, paymentMethod: "credit_card" },
      replacement.id,
    );
    expect(result).toBe(refreshed);
  });

  it("lança ServiceAlreadyCanceledException e não cria transação nem corrige o pagamento", async () => {
    const canceled = buildService({
      canceledAt: new Date("2026-07-02T00:00:00Z"),
    });
    const { useCase, transactionRepo, serviceRepo } = buildUseCase({
      serviceRepo: buildFakeServiceRepo({
        findById: jest.fn().mockResolvedValue(canceled),
      }),
    });

    await expect(useCase.execute(baseInput)).rejects.toBeInstanceOf(
      ServiceAlreadyCanceledException,
    );
    expect(transactionRepo.create).not.toHaveBeenCalled();
    expect(serviceRepo.correctPayment).not.toHaveBeenCalled();
  });

  it("lança ServicePaymentNotCorrectableException quando o serviço ainda está pendente (sem transação)", async () => {
    const pending = buildService({ paymentTransactionId: null });
    const { useCase, transactionRepo } = buildUseCase({
      serviceRepo: buildFakeServiceRepo({
        findById: jest.fn().mockResolvedValue(pending),
      }),
    });

    await expect(useCase.execute(baseInput)).rejects.toBeInstanceOf(
      ServicePaymentNotCorrectableException,
    );
    expect(transactionRepo.create).not.toHaveBeenCalled();
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

  it("lança ServicePaymentNotCorrectableException quando a transação original não é encontrada", async () => {
    const service = buildService();
    const { useCase, transactionRepo } = buildUseCase({
      serviceRepo: buildFakeServiceRepo({
        findById: jest.fn().mockResolvedValue(service),
      }),
      transactionRepo: buildFakeTransactionRepo({
        findById: jest.fn().mockResolvedValue(null),
      }),
    });

    await expect(useCase.execute(baseInput)).rejects.toBeInstanceOf(
      ServicePaymentNotCorrectableException,
    );
    expect(transactionRepo.create).not.toHaveBeenCalled();
  });

  it("lança ServicePaymentNotCorrectableException quando a transação apontada já é, ela própria, um estorno", async () => {
    const service = buildService();
    const alreadyReversal = buildTransaction({
      reversesTransactionId: "tx-original",
    });
    const { useCase, transactionRepo } = buildUseCase({
      serviceRepo: buildFakeServiceRepo({
        findById: jest.fn().mockResolvedValue(service),
      }),
      transactionRepo: buildFakeTransactionRepo({
        findById: jest.fn().mockResolvedValue(alreadyReversal),
      }),
    });

    await expect(useCase.execute(baseInput)).rejects.toBeInstanceOf(
      ServicePaymentNotCorrectableException,
    );
    expect(transactionRepo.create).not.toHaveBeenCalled();
  });

  it("lança ServicePaymentNotCorrectableException quando a transação original já possui estorno", async () => {
    const service = buildService();
    const original = buildTransaction();
    const { useCase, transactionRepo } = buildUseCase({
      serviceRepo: buildFakeServiceRepo({
        findById: jest.fn().mockResolvedValue(service),
      }),
      transactionRepo: buildFakeTransactionRepo({
        findById: jest.fn().mockResolvedValue(original),
        findReversalOf: jest
          .fn()
          .mockResolvedValue(buildTransaction({ id: "tx-2" })),
      }),
    });

    await expect(useCase.execute(baseInput)).rejects.toBeInstanceOf(
      ServicePaymentNotCorrectableException,
    );
    expect(transactionRepo.create).not.toHaveBeenCalled();
  });

  it("lança ServiceForbiddenException quando o ator não é owner, sem tocar nenhum outro repositório", async () => {
    const { useCase, serviceRepo, transactionRepo } = buildUseCase({
      memberRepo: buildFakeMemberRepo({
        findByAuthId: jest
          .fn()
          .mockResolvedValue(buildMember({ role: "employee" })),
      }),
    });

    await expect(useCase.execute(baseInput)).rejects.toBeInstanceOf(
      ServiceForbiddenException,
    );
    expect(serviceRepo.findById).not.toHaveBeenCalled();
    expect(transactionRepo.create).not.toHaveBeenCalled();
  });

  it("estorno usa o ator atual e o relançamento preserva a autoria original", async () => {
    const corrector = buildMember({ userId: "user-corrector", role: "owner" });
    const service = buildService();
    const original = buildTransaction({ createdBy: "user-original" });
    const reversal = buildTransaction({
      id: "tx-2",
      type: "outcome",
      createdBy: "user-corrector",
    });
    const replacement = buildTransaction({
      id: "tx-3",
      createdBy: "user-original",
    });

    const { useCase, transactionRepo } = buildUseCase({
      memberRepo: buildFakeMemberRepo({
        findByAuthId: jest.fn().mockResolvedValue(corrector),
      }),
      serviceRepo: buildFakeServiceRepo({
        findById: jest
          .fn()
          .mockResolvedValueOnce(service)
          .mockResolvedValueOnce(service),
      }),
      transactionRepo: buildFakeTransactionRepo({
        findById: jest.fn().mockResolvedValue(original),
        findReversalOf: jest.fn().mockResolvedValue(null),
        create: jest
          .fn()
          .mockResolvedValueOnce(reversal)
          .mockResolvedValueOnce(replacement),
      }),
    });

    await useCase.execute({
      ...baseInput,
      authId: "auth-corrector",
    });

    expect(transactionRepo.create).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ createdBy: "user-corrector" }),
    );
    expect(transactionRepo.create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ createdBy: "user-original" }),
    );
  });

  it("usa a descrição da transação original quando input.description vem vazio", async () => {
    const service = buildService();
    const original = buildTransaction({ description: "Tatuagem braço" });
    const reversal = buildTransaction({ id: "tx-2", type: "outcome" });
    const replacement = buildTransaction({ id: "tx-3" });

    const { useCase, transactionRepo } = buildUseCase({
      serviceRepo: buildFakeServiceRepo({
        findById: jest
          .fn()
          .mockResolvedValueOnce(service)
          .mockResolvedValueOnce(service),
      }),
      transactionRepo: buildFakeTransactionRepo({
        findById: jest.fn().mockResolvedValue(original),
        findReversalOf: jest.fn().mockResolvedValue(null),
        create: jest
          .fn()
          .mockResolvedValueOnce(reversal)
          .mockResolvedValueOnce(replacement),
      }),
    });

    await useCase.execute({ ...baseInput, description: "  " });

    expect(transactionRepo.create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ description: "Tatuagem braço" }),
    );
  });

  it("usa a nova descrição quando input.description vem preenchida", async () => {
    const service = buildService();
    const original = buildTransaction({ description: "Tatuagem braço" });
    const reversal = buildTransaction({ id: "tx-2", type: "outcome" });
    const replacement = buildTransaction({ id: "tx-3" });

    const { useCase, transactionRepo } = buildUseCase({
      serviceRepo: buildFakeServiceRepo({
        findById: jest
          .fn()
          .mockResolvedValueOnce(service)
          .mockResolvedValueOnce(service),
      }),
      transactionRepo: buildFakeTransactionRepo({
        findById: jest.fn().mockResolvedValue(original),
        findReversalOf: jest.fn().mockResolvedValue(null),
        create: jest
          .fn()
          .mockResolvedValueOnce(reversal)
          .mockResolvedValueOnce(replacement),
      }),
    });

    await useCase.execute({ ...baseInput, description: "Nova descrição" });

    expect(transactionRepo.create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ description: "Nova descrição" }),
    );
  });
});
