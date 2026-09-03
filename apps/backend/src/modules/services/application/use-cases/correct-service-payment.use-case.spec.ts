import { CorrectServicePaymentUseCase } from "./correct-service-payment.use-case";
import { IServiceRepository } from "../../domain/service.repository.interface";
import { ServiceEntity } from "../../domain/service.entity";
import { IMemberRepository } from "../../../organizations/domain/member.repository.interface";
import { MemberEntity } from "../../../organizations/domain/member.entity";
import { ITransactionRepository } from "../../../cashier/domain/transaction.repository.interface";
import { TransactionEntity } from "../../../cashier/domain/transaction.entity";
import { IPaymentFeeRepository } from "../../../cashier/domain/payment-fee.repository.interface";
import { IMemberPaymentFeeRepository } from "../../../cashier/domain/member-payment-fee.repository.interface";
import { MemberPaymentFeeEntity } from "../../../cashier/domain/member-payment-fee.entity";
import { computeNet } from "../../../cashier/domain/fee-calculator";
import { ServiceNotFoundException } from "../../domain/exceptions/service-not-found.exception";
import { ServiceAlreadyCanceledException } from "../../domain/exceptions/service-already-canceled.exception";
import { ServiceForbiddenException } from "../../domain/exceptions/service-forbidden.exception";
import { ServicePaymentNotCorrectableException } from "../../domain/exceptions/service-payment-not-correctable.exception";
import { ITransactionCategoryRepository } from "../../../cashier/domain/transaction-category.repository.interface";
import { TransactionCategoryEntity } from "../../../cashier/domain/transaction-category.entity";

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

function buildMemberPaymentFee(
  overrides: Partial<Parameters<typeof MemberPaymentFeeEntity.create>[0]> = {},
): MemberPaymentFeeEntity {
  return MemberPaymentFeeEntity.create({
    id: "member-fee-1",
    orgId: "org-1",
    userId: "user-1",
    paymentMethod: "credit_card",
    percent: "5.00",
    fixedCents: 0,
    active: true,
    supersededAt: null,
    createdBy: "owner-1",
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
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

function buildFakeMemberFeeRepo(
  overrides: Partial<jest.Mocked<IMemberPaymentFeeRepository>> = {},
): jest.Mocked<IMemberPaymentFeeRepository> {
  return {
    findActiveByOrg: jest.fn(),
    findActiveByOrgUserAndMethod: jest.fn().mockResolvedValue(null),
    supersede: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<IMemberPaymentFeeRepository>;
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

interface Fakes {
  serviceRepo: jest.Mocked<IServiceRepository>;
  memberRepo: jest.Mocked<IMemberRepository>;
  transactionRepo: jest.Mocked<ITransactionRepository>;
  feeRepo: jest.Mocked<IPaymentFeeRepository>;
  memberFeeRepo: jest.Mocked<IMemberPaymentFeeRepository>;
  categoryRepo: jest.Mocked<ITransactionCategoryRepository>;
}

function buildUseCase(overrides: Partial<Fakes> = {}) {
  const fakes: Fakes = {
    serviceRepo: buildFakeServiceRepo(),
    memberRepo: buildFakeMemberRepo(),
    transactionRepo: buildFakeTransactionRepo(),
    feeRepo: buildFakeFeeRepo(),
    memberFeeRepo: buildFakeMemberFeeRepo(),
    categoryRepo: buildFakeCategoryRepo(),
    ...overrides,
  };
  const useCase = new CorrectServicePaymentUseCase(
    fakes.serviceRepo,
    fakes.memberRepo,
    fakes.transactionRepo,
    fakes.feeRepo,
    fakes.memberFeeRepo,
    fakes.categoryRepo,
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
        categoryId: "cat-estorno",
        feeConfigId: null,
        feePercent: null,
        feeFixedCents: null,
        feeSource: "none",
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
        feeConfigId: null,
        feePercent: "10.00",
        feeFixedCents: 0,
        feeSource: "org",
      }),
    );
    expect(transactionRepo.create.mock.calls[1]![0]).not.toHaveProperty(
      "categoryId",
    );
    expect(serviceRepo.correctPayment).toHaveBeenCalledWith(
      service.id,
      { amountCents: 15000, paymentMethod: "credit_card" },
      replacement.id,
      {
        configId: null,
        percent: null,
        mode: null,
        baseCents: 0,
        commissionCents: 0,
      },
    );
    expect(result).toBe(refreshed);
  });

  it("preserva percent/mode do snapshot original e só recalcula baseCents/commissionCents sobre o novo valor", async () => {
    const service = buildService({
      paymentTransactionId: "tx-1",
      commissionConfigId: "commission-1",
      commissionPercent: "30.00",
      commissionMode: "gross",
      commissionBaseCents: 10000,
      commissionCents: 3000,
      amountCents: 10000,
    });
    const refreshed = buildService({
      paymentTransactionId: "tx-3",
      amountCents: 20000,
    });
    const original = buildTransaction({ id: "tx-1" });
    const reversal = buildTransaction({ id: "tx-2", type: "outcome" });
    const replacement = buildTransaction({
      id: "tx-3",
      grossCents: 20000,
      netCents: 20000,
      feeCents: 0,
    });

    const { useCase, serviceRepo } = buildUseCase({
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
    });

    await useCase.execute({
      ...baseInput,
      grossCents: 20000,
      paymentMethod: "cash",
    });

    // base = bruto (20000, modo gross) * 30% = 6000, percent/mode preservados
    expect(serviceRepo.correctPayment).toHaveBeenCalledWith(
      service.id,
      { amountCents: 20000, paymentMethod: "cash" },
      replacement.id,
      {
        configId: "commission-1",
        percent: "30.00",
        mode: "gross",
        baseCents: 20000,
        commissionCents: 6000,
      },
    );
  });

  it("não consulta MEMBER_COMMISSION_REPOSITORY nem é afetado por mudança de config vigente entre pagamento e correção", () => {
    // CorrectServicePaymentUseCase não injeta IMemberCommissionRepository —
    // a comissão da correção usa exclusivamente o snapshot já persistido no
    // serviço (service.commissionPercent/commissionMode), nunca a config
    // vigente hoje. As 6 deps do construtor estão enumeradas em buildUseCase
    // (serviceRepo, memberRepo, transactionRepo, feeRepo, memberFeeRepo,
    // categoryRepo) — nenhuma delas é o repo de comissão. Se um dia alguém
    // adicionar essa dependência, este teste (e o type-check do buildUseCase)
    // quebra.
    expect(CorrectServicePaymentUseCase.length).toBe(6);
  });

  it("serviço sem snapshot original (pago antes da feature de comissão): correção segue gravando null/0", async () => {
    const service = buildService({
      paymentTransactionId: "tx-1",
      commissionConfigId: null,
      commissionPercent: null,
      commissionMode: null,
      commissionBaseCents: 0,
      commissionCents: 0,
    });
    const refreshed = buildService({ paymentTransactionId: "tx-3" });
    const original = buildTransaction({ id: "tx-1" });
    const reversal = buildTransaction({ id: "tx-2", type: "outcome" });
    const replacement = buildTransaction({ id: "tx-3" });

    const { useCase, serviceRepo } = buildUseCase({
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
    });

    await useCase.execute(baseInput);

    expect(serviceRepo.correctPayment).toHaveBeenCalledTimes(1);
    expect(serviceRepo.correctPayment).toHaveBeenCalledWith(
      service.id,
      expect.anything(),
      replacement.id,
      {
        configId: null,
        percent: null,
        mode: null,
        baseCents: 0,
        commissionCents: 0,
      },
    );
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

  it("degrada para categoryId null na reversão quando a categoria de estorno não existe, sem falhar", async () => {
    const service = buildService();
    const original = buildTransaction();
    const reversal = buildTransaction({ id: "tx-2", type: "outcome" });
    const replacement = buildTransaction({ id: "tx-3" });

    const { useCase, transactionRepo, categoryRepo } = buildUseCase({
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
      categoryRepo: buildFakeCategoryRepo({
        findBySystemKey: jest.fn().mockResolvedValue(null),
      }),
    });

    await useCase.execute(baseInput);

    expect(categoryRepo.findBySystemKey).toHaveBeenCalledWith(
      "org-1",
      "reversal",
    );
    expect(transactionRepo.create).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ categoryId: null }),
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

  describe("taxa de pagamento na errata (substituição x estorno)", () => {
    it("substituição: performedBy com taxa própria ativa grava snapshot 'member' e feeCents da taxa do membro", async () => {
      const service = buildService({
        paymentTransactionId: "tx-1",
        performedBy: "user-1",
      });
      const refreshed = buildService({ paymentTransactionId: "tx-3" });
      const original = buildTransaction({ id: "tx-1" });
      const reversal = buildTransaction({ id: "tx-2", type: "outcome" });
      const replacement = buildTransaction({ id: "tx-3" });
      const memberFee = buildMemberPaymentFee({
        id: "member-fee-1",
        userId: "user-1",
        paymentMethod: "credit_card",
        percent: "5.00",
        fixedCents: 0,
      });
      const orgFee = { percent: "10.00", fixedCents: 0 };

      const { useCase, transactionRepo, memberFeeRepo } = buildUseCase({
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
          findByOrgAndMethod: jest.fn().mockResolvedValue(orgFee),
        }),
        memberFeeRepo: buildFakeMemberFeeRepo({
          findActiveByOrgUserAndMethod: jest.fn().mockResolvedValue(memberFee),
        }),
      });

      await useCase.execute(baseInput);

      expect(memberFeeRepo.findActiveByOrgUserAndMethod).toHaveBeenCalledWith(
        "org-1",
        "user-1",
        "credit_card",
      );
      // taxa do membro (5%), não a da org (10%): fee 750, líquido 14250
      const { feeCents, netCents } = computeNet(15000, "credit_card", {
        percent: "5.00",
        fixedCents: 0,
      });
      expect(feeCents).toBe(750);
      expect(transactionRepo.create).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          grossCents: 15000,
          feeCents,
          netCents,
          feeConfigId: "member-fee-1",
          feePercent: "5.00",
          feeFixedCents: 0,
          feeSource: "member",
        }),
      );
    });

    it("substituição: sem taxa do membro cai na taxa VIGENTE da org com snapshot 'org' e feeConfigId null", async () => {
      const service = buildService({
        paymentTransactionId: "tx-1",
        performedBy: "user-1",
      });
      const refreshed = buildService({ paymentTransactionId: "tx-3" });
      const original = buildTransaction({ id: "tx-1" });
      const reversal = buildTransaction({ id: "tx-2", type: "outcome" });
      const replacement = buildTransaction({ id: "tx-3" });
      const orgFee = { percent: "10.00", fixedCents: 0 };

      const { useCase, transactionRepo } = buildUseCase({
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
          findByOrgAndMethod: jest.fn().mockResolvedValue(orgFee),
        }),
        memberFeeRepo: buildFakeMemberFeeRepo({
          findActiveByOrgUserAndMethod: jest.fn().mockResolvedValue(null),
        }),
      });

      await useCase.execute(baseInput);

      // taxa vigente da org (10%): fee 1500, líquido 13500
      expect(transactionRepo.create).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          grossCents: 15000,
          feeCents: 1500,
          netCents: 13500,
          feeConfigId: null,
          feePercent: "10.00",
          feeFixedCents: 0,
          feeSource: "org",
        }),
      );
    });

    it("estorno: grava feeSource 'none' e copia feeCents/netCents do lançamento ORIGINAL sem recalcular", async () => {
      const service = buildService({ paymentTransactionId: "tx-1" });
      const refreshed = buildService({ paymentTransactionId: "tx-3" });
      // original com taxa que uma reconsulta (org sem fee → computeNet = 0) NÃO reproduziria
      const original = buildTransaction({
        id: "tx-1",
        paymentMethod: "credit_card",
        grossCents: 10000,
        feeCents: 1000,
        netCents: 9000,
      });
      const reversal = buildTransaction({ id: "tx-2", type: "outcome" });
      const replacement = buildTransaction({ id: "tx-3" });

      const { useCase, transactionRepo } = buildUseCase({
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
      });

      await useCase.execute(baseInput);

      expect(transactionRepo.create).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          type: "outcome",
          reversesTransactionId: "tx-1",
          grossCents: 10000,
          feeCents: 1000,
          netCents: 9000,
          feeConfigId: null,
          feePercent: null,
          feeFixedCents: null,
          feeSource: "none",
        }),
      );
    });
  });
});
