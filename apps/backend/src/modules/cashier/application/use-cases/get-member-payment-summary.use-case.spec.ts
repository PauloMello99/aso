import { GetMemberPaymentSummaryUseCase } from "./get-member-payment-summary.use-case";
import { IMemberPaymentRepository } from "../../domain/member-payment.repository.interface";
import { IMemberRepository } from "../../../organizations/domain/member.repository.interface";
import { MemberEntity } from "../../../organizations/domain/member.entity";
import { IServiceRepository } from "../../../services/domain/service.repository.interface";
import { CashierForbiddenException } from "../../domain/exceptions/cashier-forbidden.exception";

// Cenário de referência: dono O, funcionários A e B
// (docs/testing/employee-visibility-tests.md).
function buildMember(
  overrides: Partial<Parameters<typeof MemberEntity.create>[0]> = {},
): MemberEntity {
  return MemberEntity.create({
    memberId: "member-O",
    orgId: "org-1",
    userId: "user-O",
    role: "owner",
    enabled: true,
    permissions: [],
    userName: "Dono",
    userEmail: "dono@example.com",
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
    findByAuthId: jest.fn(),
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

function buildFakeMemberPaymentRepo(
  overrides: Partial<jest.Mocked<IMemberPaymentRepository>> = {},
): jest.Mocked<IMemberPaymentRepository> {
  return {
    create: jest.fn(),
    findById: jest.fn(),
    findAllByOrgAndUser: jest.fn(),
    findReversedIds: jest.fn(),
    netPaidCents: jest.fn().mockResolvedValue(0),
    ...overrides,
  } as unknown as jest.Mocked<IMemberPaymentRepository>;
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
    commissionCentsByPeriod: jest.fn().mockResolvedValue(0),
    memberTotalsByPeriod: jest.fn().mockResolvedValue({
      grossRevenueCents: 0,
      feesCents: 0,
      materialCostCents: 0,
    }),
    ...overrides,
  } as unknown as jest.Mocked<IServiceRepository>;
}

describe("GetMemberPaymentSummaryUseCase", () => {
  it("funcionário lendo o próprio resumo recebe o saldo", async () => {
    const memberRepo = buildFakeMemberRepo({
      findByAuthId: jest.fn().mockResolvedValue(
        buildMember({
          memberId: "member-A",
          userId: "user-A",
          role: "employee",
        }),
      ),
    });
    const memberPaymentRepo = buildFakeMemberPaymentRepo({
      netPaidCents: jest.fn().mockResolvedValue(3000),
    });
    const serviceRepo = buildFakeServiceRepo({
      commissionCentsByPeriod: jest.fn().mockResolvedValue(10000),
    });
    const useCase = new GetMemberPaymentSummaryUseCase(
      memberPaymentRepo,
      memberRepo,
      serviceRepo,
    );

    const result = await useCase.execute({
      orgId: "org-1",
      authId: "auth-A",
      targetUserId: "user-A",
    });

    expect(result).toEqual({
      accruedCommissionCents: 10000,
      paidNetCents: 3000,
      balanceDueCents: 7000,
      grossRevenueCents: 0,
      feesCents: 0,
      studioNetCents: -10000,
      materialCostCents: 0,
    });
  });

  it("soma bruta/taxas/material dos snapshots e calcula o líquido do estúdio (bruta - taxas - comissão)", async () => {
    const memberRepo = buildFakeMemberRepo({
      findByAuthId: jest.fn().mockResolvedValue(buildMember()),
    });
    const memberPaymentRepo = buildFakeMemberPaymentRepo({
      netPaidCents: jest.fn().mockResolvedValue(2000),
    });
    const serviceRepo = buildFakeServiceRepo({
      commissionCentsByPeriod: jest.fn().mockResolvedValue(4000),
      memberTotalsByPeriod: jest.fn().mockResolvedValue({
        grossRevenueCents: 20000,
        feesCents: 700,
        materialCostCents: 1500,
      }),
    });
    const useCase = new GetMemberPaymentSummaryUseCase(
      memberPaymentRepo,
      memberRepo,
      serviceRepo,
    );

    const result = await useCase.execute({
      orgId: "org-1",
      authId: "auth-O",
      targetUserId: "user-A",
    });

    expect(serviceRepo.memberTotalsByPeriod).toHaveBeenCalledWith(
      "org-1",
      expect.any(Date),
      expect.any(Date),
      "user-A",
    );
    expect(result).toEqual({
      accruedCommissionCents: 4000,
      paidNetCents: 2000,
      balanceDueCents: 2000,
      grossRevenueCents: 20000,
      feesCents: 700,
      studioNetCents: 15300,
      materialCostCents: 1500,
    });
  });

  it("funcionário só recebe os totais do PRÓPRIO id (memberTotalsByPeriod escopado ao ator) e nunca com null", async () => {
    const memberRepo = buildFakeMemberRepo({
      findByAuthId: jest.fn().mockResolvedValue(
        buildMember({ memberId: "member-A", userId: "user-A", role: "employee" }),
      ),
    });
    const serviceRepo = buildFakeServiceRepo();
    const useCase = new GetMemberPaymentSummaryUseCase(
      buildFakeMemberPaymentRepo(),
      memberRepo,
      serviceRepo,
    );

    await useCase.execute({
      orgId: "org-1",
      authId: "auth-A",
      targetUserId: "user-A",
    });

    expect(serviceRepo.memberTotalsByPeriod.mock.calls[0]![3]).toBe("user-A");
  });

  it("funcionário lendo o resumo de OUTRO membro não dispara memberTotalsByPeriod", async () => {
    const memberRepo = buildFakeMemberRepo({
      findByAuthId: jest.fn().mockResolvedValue(
        buildMember({ memberId: "member-A", userId: "user-A", role: "employee" }),
      ),
    });
    const serviceRepo = buildFakeServiceRepo();
    const useCase = new GetMemberPaymentSummaryUseCase(
      buildFakeMemberPaymentRepo(),
      memberRepo,
      serviceRepo,
    );

    await expect(
      useCase.execute({
        orgId: "org-1",
        authId: "auth-A",
        targetUserId: "user-B",
      }),
    ).rejects.toBeInstanceOf(CashierForbiddenException);
    expect(serviceRepo.memberTotalsByPeriod).not.toHaveBeenCalled();
  });

  it("funcionário lendo o resumo de OUTRO membro recebe CashierForbiddenException", async () => {
    const memberRepo = buildFakeMemberRepo({
      findByAuthId: jest.fn().mockResolvedValue(
        buildMember({
          memberId: "member-A",
          userId: "user-A",
          role: "employee",
        }),
      ),
    });
    const memberPaymentRepo = buildFakeMemberPaymentRepo();
    const serviceRepo = buildFakeServiceRepo();
    const useCase = new GetMemberPaymentSummaryUseCase(
      memberPaymentRepo,
      memberRepo,
      serviceRepo,
    );

    await expect(
      useCase.execute({
        orgId: "org-1",
        authId: "auth-A",
        targetUserId: "user-B",
      }),
    ).rejects.toBeInstanceOf(CashierForbiddenException);
    expect(serviceRepo.commissionCentsByPeriod).not.toHaveBeenCalled();
    expect(memberPaymentRepo.netPaidCents).not.toHaveBeenCalled();
  });

  it("owner lendo o resumo de qualquer membro recebe o saldo", async () => {
    const memberRepo = buildFakeMemberRepo({
      findByAuthId: jest.fn().mockResolvedValue(buildMember()),
    });
    const memberPaymentRepo = buildFakeMemberPaymentRepo({
      netPaidCents: jest.fn().mockResolvedValue(1000),
    });
    const serviceRepo = buildFakeServiceRepo({
      commissionCentsByPeriod: jest.fn().mockResolvedValue(5000),
    });
    const useCase = new GetMemberPaymentSummaryUseCase(
      memberPaymentRepo,
      memberRepo,
      serviceRepo,
    );

    const result = await useCase.execute({
      orgId: "org-1",
      authId: "auth-O",
      targetUserId: "user-B",
    });

    expect(memberPaymentRepo.netPaidCents).toHaveBeenCalledWith(
      "org-1",
      "user-B",
    );
    expect(result.balanceDueCents).toBe(4000);
  });

  it("saldo devido correto após um pagamento parcial (accrued > paid)", async () => {
    const memberRepo = buildFakeMemberRepo({
      findByAuthId: jest.fn().mockResolvedValue(buildMember()),
    });
    const memberPaymentRepo = buildFakeMemberPaymentRepo({
      netPaidCents: jest.fn().mockResolvedValue(4000),
    });
    const serviceRepo = buildFakeServiceRepo({
      commissionCentsByPeriod: jest.fn().mockResolvedValue(10000),
    });
    const useCase = new GetMemberPaymentSummaryUseCase(
      memberPaymentRepo,
      memberRepo,
      serviceRepo,
    );

    const result = await useCase.execute({
      orgId: "org-1",
      authId: "auth-O",
      targetUserId: "user-A",
    });

    expect(result.balanceDueCents).toBe(6000);
  });

  it("saldo devido volta ao valor cheio depois de um estorno (netPaidCents já reflete a exclusão)", async () => {
    const memberRepo = buildFakeMemberRepo({
      findByAuthId: jest.fn().mockResolvedValue(buildMember()),
    });
    // netPaidCents=0 simula o cenário pós-estorno já coberto pelo passo 5
    // (a soma exclui a linha original porque existe estorno apontando pra ela).
    const memberPaymentRepo = buildFakeMemberPaymentRepo({
      netPaidCents: jest.fn().mockResolvedValue(0),
    });
    const serviceRepo = buildFakeServiceRepo({
      commissionCentsByPeriod: jest.fn().mockResolvedValue(10000),
    });
    const useCase = new GetMemberPaymentSummaryUseCase(
      memberPaymentRepo,
      memberRepo,
      serviceRepo,
    );

    const result = await useCase.execute({
      orgId: "org-1",
      authId: "auth-O",
      targetUserId: "user-A",
    });

    expect(result).toEqual({
      accruedCommissionCents: 10000,
      paidNetCents: 0,
      balanceDueCents: 10000,
      grossRevenueCents: 0,
      feesCents: 0,
      studioNetCents: -10000,
      materialCostCents: 0,
    });
  });

  it("saldo nunca fica negativo mesmo se paidNetCents > accruedCommissionCents", async () => {
    const memberRepo = buildFakeMemberRepo({
      findByAuthId: jest.fn().mockResolvedValue(buildMember()),
    });
    const memberPaymentRepo = buildFakeMemberPaymentRepo({
      netPaidCents: jest.fn().mockResolvedValue(9000),
    });
    const serviceRepo = buildFakeServiceRepo({
      commissionCentsByPeriod: jest.fn().mockResolvedValue(5000),
    });
    const useCase = new GetMemberPaymentSummaryUseCase(
      memberPaymentRepo,
      memberRepo,
      serviceRepo,
    );

    const result = await useCase.execute({
      orgId: "org-1",
      authId: "auth-O",
      targetUserId: "user-A",
    });

    expect(result.balanceDueCents).toBe(0);
  });

  it("NUNCA chama commissionCentsByPeriod com performedBy null ou undefined (vazamento cross-membro)", async () => {
    const memberRepo = buildFakeMemberRepo({
      findByAuthId: jest.fn().mockResolvedValue(buildMember()),
    });
    const memberPaymentRepo = buildFakeMemberPaymentRepo();
    const serviceRepo = buildFakeServiceRepo();
    const useCase = new GetMemberPaymentSummaryUseCase(
      memberPaymentRepo,
      memberRepo,
      serviceRepo,
    );

    await useCase.execute({
      orgId: "org-1",
      authId: "auth-O",
      targetUserId: "user-A",
    });

    expect(serviceRepo.commissionCentsByPeriod).toHaveBeenCalledTimes(1);
    const call = serviceRepo.commissionCentsByPeriod.mock.calls[0]!;
    const performedByArg = call[3];
    expect(performedByArg).toBe("user-A");
    expect(performedByArg).not.toBeNull();
    expect(performedByArg).not.toBeUndefined();
  });

  it("saldo devido é vitalício: from é epoch e to é aproximadamente agora, independente de period_start/period_end", async () => {
    const memberRepo = buildFakeMemberRepo({
      findByAuthId: jest.fn().mockResolvedValue(buildMember()),
    });
    const memberPaymentRepo = buildFakeMemberPaymentRepo();
    const serviceRepo = buildFakeServiceRepo();
    const useCase = new GetMemberPaymentSummaryUseCase(
      memberPaymentRepo,
      memberRepo,
      serviceRepo,
    );

    const before = Date.now();
    await useCase.execute({
      orgId: "org-1",
      authId: "auth-O",
      targetUserId: "user-A",
    });
    const after = Date.now();

    const [, from, to] = serviceRepo.commissionCentsByPeriod.mock.calls[0]!;
    expect(from.getTime()).toBe(0);
    expect(to.getTime()).toBeGreaterThanOrEqual(before);
    expect(to.getTime()).toBeLessThanOrEqual(after);
  });
});
