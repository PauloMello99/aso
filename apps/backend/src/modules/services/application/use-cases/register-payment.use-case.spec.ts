import { RegisterPaymentUseCase } from "./register-payment.use-case";
import { IServiceRepository } from "../../domain/service.repository.interface";
import { ServiceEntity } from "../../domain/service.entity";
import { IMemberRepository } from "../../../organizations/domain/member.repository.interface";
import { MemberEntity } from "../../../organizations/domain/member.entity";
import { ITransactionRepository } from "../../../cashier/domain/transaction.repository.interface";
import { TransactionEntity } from "../../../cashier/domain/transaction.entity";
import { IPaymentFeeRepository } from "../../../cashier/domain/payment-fee.repository.interface";
import { IMemberPaymentFeeRepository } from "../../../cashier/domain/member-payment-fee.repository.interface";
import { MemberPaymentFeeEntity } from "../../../cashier/domain/member-payment-fee.entity";
import { IMemberCommissionRepository } from "../../../cashier/domain/member-commission.repository.interface";
import { MemberCommissionEntity } from "../../../cashier/domain/member-commission.entity";
import { computeNet } from "../../../cashier/domain/fee-calculator";
import { ServiceNotFoundException } from "../../domain/exceptions/service-not-found.exception";
import { ServiceNotPayableException } from "../../domain/exceptions/service-not-payable.exception";
import { ServiceForbiddenException } from "../../domain/exceptions/service-forbidden.exception";

function buildService(
  overrides: Partial<Parameters<typeof ServiceEntity.create>[0]> = {},
): ServiceEntity {
  return ServiceEntity.create({
    id: "service-1",
    orgId: "org-1",
    serviceTypeId: null,
    customerId: null,
    paymentTransactionId: null,
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
    createdBy: "user-1",
    description: "Serviço",
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

function buildCommission(
  overrides: Partial<Parameters<typeof MemberCommissionEntity.create>[0]> = {},
): MemberCommissionEntity {
  return MemberCommissionEntity.create({
    id: "commission-1",
    orgId: "org-1",
    userId: "user-1",
    percent: "30.00",
    mode: "gross",
    active: true,
    supersededAt: null,
    createdBy: "owner-1",
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
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
    existsByPaymentTransactionId: jest.fn(),
    findServiceIdsByTransactionIds: jest.fn(),
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
    create: jest.fn().mockResolvedValue(buildTransaction()),
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

function buildFakeCommissionRepo(
  overrides: Partial<jest.Mocked<IMemberCommissionRepository>> = {},
): jest.Mocked<IMemberCommissionRepository> {
  return {
    findActiveByOrg: jest.fn(),
    findActiveByOrgAndUser: jest.fn().mockResolvedValue(null),
    findHistoryByOrgAndUser: jest.fn(),
    supersede: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<IMemberCommissionRepository>;
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

interface Fakes {
  serviceRepo: jest.Mocked<IServiceRepository>;
  memberRepo: jest.Mocked<IMemberRepository>;
  transactionRepo: jest.Mocked<ITransactionRepository>;
  feeRepo: jest.Mocked<IPaymentFeeRepository>;
  memberFeeRepo: jest.Mocked<IMemberPaymentFeeRepository>;
  commissionRepo: jest.Mocked<IMemberCommissionRepository>;
}

function buildUseCase(overrides: Partial<Fakes> = {}) {
  const fakes: Fakes = {
    serviceRepo: buildFakeServiceRepo(),
    memberRepo: buildFakeMemberRepo(),
    transactionRepo: buildFakeTransactionRepo(),
    feeRepo: buildFakeFeeRepo(),
    memberFeeRepo: buildFakeMemberFeeRepo(),
    commissionRepo: buildFakeCommissionRepo(),
    ...overrides,
  };
  const useCase = new RegisterPaymentUseCase(
    fakes.serviceRepo,
    fakes.memberRepo,
    fakes.transactionRepo,
    fakes.feeRepo,
    fakes.memberFeeRepo,
    fakes.commissionRepo,
  );
  return { useCase, ...fakes };
}

const baseInput = {
  orgId: "org-1",
  serviceId: "service-1",
  authId: "auth-1",
};

describe("RegisterPaymentUseCase", () => {
  it("cartão + comissão modo gross: base é o valor bruto", async () => {
    const service = buildService({ amountCents: 10000, paymentMethod: "credit_card" });
    const refreshed = buildService({ paymentTransactionId: "tx-1" });
    const fee = { percent: "10.00", fixedCents: 0 };
    const commission = buildCommission({ percent: "30.00", mode: "gross" });

    const { useCase, serviceRepo } = buildUseCase({
      serviceRepo: buildFakeServiceRepo({
        findById: jest
          .fn()
          .mockResolvedValueOnce(service)
          .mockResolvedValueOnce(refreshed),
      }),
      feeRepo: buildFakeFeeRepo({
        findByOrgAndMethod: jest.fn().mockResolvedValue(fee),
      }),
      commissionRepo: buildFakeCommissionRepo({
        findActiveByOrgAndUser: jest.fn().mockResolvedValue(commission),
      }),
    });

    const result = await useCase.execute(baseInput);

    // base = bruto (10000) * 30% = 3000
    expect(serviceRepo.setPaymentTransaction).toHaveBeenCalledTimes(1);
    expect(serviceRepo.setPaymentTransaction).toHaveBeenCalledWith(
      "service-1",
      "tx-1",
      {
        configId: "commission-1",
        percent: "30.00",
        mode: "gross",
        baseCents: 10000,
        commissionCents: 3000,
      },
    );
    expect(result).toBe(refreshed);
  });

  it("cartão + comissão modo net: base é o valor líquido pós-taxa", async () => {
    const service = buildService({ amountCents: 10000, paymentMethod: "credit_card" });
    const refreshed = buildService({ paymentTransactionId: "tx-1" });
    const fee = { percent: "10.00", fixedCents: 0 };
    const commission = buildCommission({ percent: "30.00", mode: "net" });
    const { netCents } = computeNet(10000, "credit_card", fee);

    const { useCase, serviceRepo } = buildUseCase({
      serviceRepo: buildFakeServiceRepo({
        findById: jest
          .fn()
          .mockResolvedValueOnce(service)
          .mockResolvedValueOnce(refreshed),
      }),
      feeRepo: buildFakeFeeRepo({
        findByOrgAndMethod: jest.fn().mockResolvedValue(fee),
      }),
      commissionRepo: buildFakeCommissionRepo({
        findActiveByOrgAndUser: jest.fn().mockResolvedValue(commission),
      }),
    });

    await useCase.execute(baseInput);

    const expectedCommission = Math.round((netCents * 30) / 100);
    expect(serviceRepo.setPaymentTransaction).toHaveBeenCalledWith(
      "service-1",
      "tx-1",
      expect.objectContaining({
        baseCents: netCents,
        commissionCents: expectedCommission,
      }),
    );
  });

  it("dinheiro/pix com comissão: calcula normalmente, sem zerar por causa do método de pagamento", async () => {
    const service = buildService({ amountCents: 10000, paymentMethod: "cash" });
    const refreshed = buildService({ paymentTransactionId: "tx-1" });
    const commission = buildCommission({ percent: "20.00", mode: "gross" });

    const { useCase, serviceRepo, feeRepo } = buildUseCase({
      serviceRepo: buildFakeServiceRepo({
        findById: jest
          .fn()
          .mockResolvedValueOnce(service)
          .mockResolvedValueOnce(refreshed),
      }),
      commissionRepo: buildFakeCommissionRepo({
        findActiveByOrgAndUser: jest.fn().mockResolvedValue(commission),
      }),
    });

    await useCase.execute(baseInput);

    expect(feeRepo.findByOrgAndMethod).toHaveBeenCalledWith("org-1", "cash");
    expect(serviceRepo.setPaymentTransaction).toHaveBeenCalledWith(
      "service-1",
      "tx-1",
      expect.objectContaining({ baseCents: 10000, commissionCents: 2000 }),
    );
  });

  it("performedBy null: snapshot todo null/0 e commissionRepo nunca chamado", async () => {
    const service = buildService({ performedBy: null });
    const refreshed = buildService({ paymentTransactionId: "tx-1", performedBy: null });

    const { useCase, serviceRepo, commissionRepo } = buildUseCase({
      serviceRepo: buildFakeServiceRepo({
        findById: jest
          .fn()
          .mockResolvedValueOnce(service)
          .mockResolvedValueOnce(refreshed),
      }),
    });

    await useCase.execute(baseInput);

    expect(commissionRepo.findActiveByOrgAndUser).not.toHaveBeenCalled();
    expect(serviceRepo.setPaymentTransaction).toHaveBeenCalledWith(
      "service-1",
      "tx-1",
      {
        configId: null,
        percent: null,
        mode: null,
        baseCents: 0,
        commissionCents: 0,
      },
    );
  });

  it("profissional sem config ativa: snapshot todo null/0, mas setPaymentTransaction é chamado normalmente", async () => {
    const service = buildService();
    const refreshed = buildService({ paymentTransactionId: "tx-1" });

    const { useCase, serviceRepo, commissionRepo } = buildUseCase({
      serviceRepo: buildFakeServiceRepo({
        findById: jest
          .fn()
          .mockResolvedValueOnce(service)
          .mockResolvedValueOnce(refreshed),
      }),
      commissionRepo: buildFakeCommissionRepo({
        findActiveByOrgAndUser: jest.fn().mockResolvedValue(null),
      }),
    });

    await expect(useCase.execute(baseInput)).resolves.toBe(refreshed);

    expect(commissionRepo.findActiveByOrgAndUser).toHaveBeenCalledWith(
      "org-1",
      "user-1",
    );
    expect(serviceRepo.setPaymentTransaction).toHaveBeenCalledTimes(1);
    expect(serviceRepo.setPaymentTransaction).toHaveBeenCalledWith(
      "service-1",
      "tx-1",
      {
        configId: null,
        percent: null,
        mode: null,
        baseCents: 0,
        commissionCents: 0,
      },
    );
  });

  it("comissão é calculada sobre quem executou o serviço, não sobre o ator autenticado", async () => {
    const service = buildService({ performedBy: "professional-1" });
    const refreshed = buildService({ paymentTransactionId: "tx-1" });
    const owner = buildMember({ userId: "owner-1", role: "owner" });
    const commission = buildCommission({ userId: "professional-1" });

    const { useCase, commissionRepo } = buildUseCase({
      memberRepo: buildFakeMemberRepo({
        findByAuthId: jest.fn().mockResolvedValue(owner),
      }),
      serviceRepo: buildFakeServiceRepo({
        findById: jest
          .fn()
          .mockResolvedValueOnce(service)
          .mockResolvedValueOnce(refreshed),
      }),
      commissionRepo: buildFakeCommissionRepo({
        findActiveByOrgAndUser: jest.fn().mockResolvedValue(commission),
      }),
    });

    await useCase.execute({ ...baseInput, authId: "auth-owner" });

    expect(commissionRepo.findActiveByOrgAndUser).toHaveBeenCalledWith(
      "org-1",
      "professional-1",
    );
  });

  describe("taxa de pagamento por executor (performedBy)", () => {
    it("performedBy com taxa própria ativa: snapshot 'member' e comissão modo net sobre o líquido pós-taxa do membro", async () => {
      const service = buildService({
        amountCents: 10000,
        paymentMethod: "credit_card",
        performedBy: "user-1",
      });
      const refreshed = buildService({ paymentTransactionId: "tx-1" });
      const memberFee = buildMemberPaymentFee({
        id: "member-fee-1",
        userId: "user-1",
        paymentMethod: "credit_card",
        percent: "5.00",
        fixedCents: 0,
      });
      const orgFee = { percent: "10.00", fixedCents: 0 };
      const commission = buildCommission({ percent: "30.00", mode: "net" });

      const { useCase, transactionRepo, serviceRepo, memberFeeRepo } =
        buildUseCase({
          serviceRepo: buildFakeServiceRepo({
            findById: jest
              .fn()
              .mockResolvedValueOnce(service)
              .mockResolvedValueOnce(refreshed),
          }),
          feeRepo: buildFakeFeeRepo({
            findByOrgAndMethod: jest.fn().mockResolvedValue(orgFee),
          }),
          memberFeeRepo: buildFakeMemberFeeRepo({
            findActiveByOrgUserAndMethod: jest
              .fn()
              .mockResolvedValue(memberFee),
          }),
          commissionRepo: buildFakeCommissionRepo({
            findActiveByOrgAndUser: jest.fn().mockResolvedValue(commission),
          }),
        });

      await useCase.execute(baseInput);

      expect(memberFeeRepo.findActiveByOrgUserAndMethod).toHaveBeenCalledWith(
        "org-1",
        "user-1",
        "credit_card",
      );
      // taxa do membro (5%), não a da org (10%): fee 500, líquido 9500
      expect(transactionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          feeCents: 500,
          netCents: 9500,
          feeConfigId: "member-fee-1",
          feePercent: "5.00",
          feeFixedCents: 0,
          feeSource: "member",
        }),
      );
      // comissão modo net: 30% de 9500 (líquido pós-taxa do membro) = 2850
      expect(serviceRepo.setPaymentTransaction).toHaveBeenCalledWith(
        "service-1",
        "tx-1",
        expect.objectContaining({ baseCents: 9500, commissionCents: 2850 }),
      );
    });

    it("performedBy sem taxa própria, org configurada: snapshot 'org' com feeConfigId null e números da org", async () => {
      const service = buildService({
        amountCents: 10000,
        paymentMethod: "credit_card",
        performedBy: "user-1",
      });
      const refreshed = buildService({ paymentTransactionId: "tx-1" });
      const orgFee = { percent: "10.00", fixedCents: 0 };

      const { useCase, transactionRepo, memberFeeRepo } = buildUseCase({
        serviceRepo: buildFakeServiceRepo({
          findById: jest
            .fn()
            .mockResolvedValueOnce(service)
            .mockResolvedValueOnce(refreshed),
        }),
        feeRepo: buildFakeFeeRepo({
          findByOrgAndMethod: jest.fn().mockResolvedValue(orgFee),
        }),
        memberFeeRepo: buildFakeMemberFeeRepo({
          findActiveByOrgUserAndMethod: jest.fn().mockResolvedValue(null),
        }),
      });

      await useCase.execute(baseInput);

      expect(memberFeeRepo.findActiveByOrgUserAndMethod).toHaveBeenCalledWith(
        "org-1",
        "user-1",
        "credit_card",
      );
      expect(transactionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          feeCents: 1000,
          netCents: 9000,
          feeConfigId: null,
          feePercent: "10.00",
          feeFixedCents: 0,
          feeSource: "org",
        }),
      );
    });

    it("serviço sem performedBy: não consulta o repo de taxa de membro e cai na taxa da org", async () => {
      const service = buildService({
        amountCents: 10000,
        paymentMethod: "credit_card",
        performedBy: null,
      });
      const refreshed = buildService({
        paymentTransactionId: "tx-1",
        performedBy: null,
      });
      const orgFee = { percent: "10.00", fixedCents: 0 };

      const { useCase, transactionRepo, memberFeeRepo } = buildUseCase({
        serviceRepo: buildFakeServiceRepo({
          findById: jest
            .fn()
            .mockResolvedValueOnce(service)
            .mockResolvedValueOnce(refreshed),
        }),
        feeRepo: buildFakeFeeRepo({
          findByOrgAndMethod: jest.fn().mockResolvedValue(orgFee),
        }),
      });

      await useCase.execute(baseInput);

      expect(
        memberFeeRepo.findActiveByOrgUserAndMethod,
      ).not.toHaveBeenCalled();
      expect(transactionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          feeCents: 1000,
          netCents: 9000,
          feeConfigId: null,
          feePercent: "10.00",
          feeFixedCents: 0,
          feeSource: "org",
        }),
      );
    });

    it("método não elegível a taxa (dinheiro): snapshot 'none' e feeCents 0 mesmo com performedBy", async () => {
      const service = buildService({
        amountCents: 10000,
        paymentMethod: "cash",
        performedBy: "user-1",
      });
      const refreshed = buildService({ paymentTransactionId: "tx-1" });

      const { useCase, transactionRepo } = buildUseCase({
        serviceRepo: buildFakeServiceRepo({
          findById: jest
            .fn()
            .mockResolvedValueOnce(service)
            .mockResolvedValueOnce(refreshed),
        }),
      });

      await useCase.execute(baseInput);

      expect(transactionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          feeCents: 0,
          netCents: 10000,
          feeConfigId: null,
          feePercent: null,
          feeFixedCents: null,
          feeSource: "none",
        }),
      );
    });
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

  it("lança ServiceForbiddenException quando não é owner nem o profissional do serviço", async () => {
    const service = buildService({ performedBy: "other-user" });
    const { useCase, serviceRepo } = buildUseCase({
      memberRepo: buildFakeMemberRepo({
        findByAuthId: jest
          .fn()
          .mockResolvedValue(buildMember({ role: "employee" })),
      }),
      serviceRepo: buildFakeServiceRepo({
        findById: jest.fn().mockResolvedValue(service),
      }),
    });

    await expect(useCase.execute(baseInput)).rejects.toBeInstanceOf(
      ServiceForbiddenException,
    );
    expect(serviceRepo.setPaymentTransaction).not.toHaveBeenCalled();
  });

  it("lança ServiceNotPayableException quando o serviço não está pending", async () => {
    const paid = buildService({ paymentTransactionId: "tx-existing" });
    const { useCase, serviceRepo } = buildUseCase({
      serviceRepo: buildFakeServiceRepo({
        findById: jest.fn().mockResolvedValue(paid),
      }),
    });

    await expect(useCase.execute(baseInput)).rejects.toBeInstanceOf(
      ServiceNotPayableException,
    );
    expect(serviceRepo.setPaymentTransaction).not.toHaveBeenCalled();
  });
});
