import { UpsertMemberCommissionsUseCase } from "./upsert-member-commissions.use-case";
import { IMemberCommissionRepository } from "../../domain/member-commission.repository.interface";
import { MemberCommissionEntity } from "../../domain/member-commission.entity";
import { IOrganizationRepository } from "../../../organizations/domain/org.repository.interface";
import { IMemberRepository } from "../../../organizations/domain/member.repository.interface";
import { MemberEntity } from "../../../organizations/domain/member.entity";
import { CashierForbiddenException } from "../../domain/exceptions/cashier-forbidden.exception";
import { CommissionMemberNotFoundException } from "../../domain/exceptions/commission-member-not-found.exception";
import { AuditService } from "../../../audit/audit.service";

function buildCommission(
  overrides: Partial<Parameters<typeof MemberCommissionEntity.create>[0]> = {},
): MemberCommissionEntity {
  return MemberCommissionEntity.create({
    id: "commission-1",
    orgId: "org-1",
    userId: "user-1",
    percent: "10.00",
    mode: "gross",
    active: true,
    supersededAt: null,
    createdBy: "owner-1",
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
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
    role: "employee",
    enabled: true,
    permissions: [],
    userName: "Fulano",
    userEmail: "fulano@example.com",
    joinedAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  });
}

function buildFakeCommissionRepo(
  overrides: Partial<jest.Mocked<IMemberCommissionRepository>> = {},
): jest.Mocked<IMemberCommissionRepository> {
  return {
    findActiveByOrg: jest.fn().mockResolvedValue([]),
    findActiveByOrgAndUser: jest.fn().mockResolvedValue(null),
    findHistoryByOrgAndUser: jest.fn(),
    supersede: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<IMemberCommissionRepository>;
}

function buildFakeOrgRepo(
  overrides: Partial<jest.Mocked<IOrganizationRepository>> = {},
): jest.Mocked<IOrganizationRepository> {
  return {
    findAllByAuthId: jest.fn(),
    findByIdAndAuthId: jest.fn(),
    findBySlugAndAuthId: jest.fn(),
    isOwner: jest.fn().mockResolvedValue(true),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<IOrganizationRepository>;
}

function buildFakeMemberRepo(
  overrides: Partial<jest.Mocked<IMemberRepository>> = {},
): jest.Mocked<IMemberRepository> {
  return {
    findAllByOrg: jest.fn().mockResolvedValue([buildMember()]),
    upsert: jest.fn(),
    findByMemberId: jest.fn(),
    findByAuthId: jest
      .fn()
      .mockResolvedValue(buildMember({ userId: "owner-1", role: "owner" })),
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

function buildFakeAuditService(
  overrides: Partial<jest.Mocked<AuditService>> = {},
): jest.Mocked<AuditService> {
  return {
    log: jest.fn(),
    logByAuthId: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<AuditService>;
}

describe("UpsertMemberCommissionsUseCase", () => {
  it("lança CashierForbiddenException quando o autor não é owner e nunca chama supersede", async () => {
    const commissionRepo = buildFakeCommissionRepo();
    const orgRepo = buildFakeOrgRepo({
      isOwner: jest.fn().mockResolvedValue(false),
    });
    const memberRepo = buildFakeMemberRepo();
    const auditService = buildFakeAuditService();
    const useCase = new UpsertMemberCommissionsUseCase(
      commissionRepo,
      orgRepo,
      memberRepo,
      auditService,
    );

    await expect(
      useCase.execute({
        orgId: "org-1",
        authId: "not-owner",
        commissions: [{ userId: "user-1", percent: "15.00", mode: "gross" }],
      }),
    ).rejects.toBeInstanceOf(CashierForbiddenException);
    expect(commissionRepo.supersede).not.toHaveBeenCalled();
  });

  it("chama supersede uma vez por item com valor diferente do vigente", async () => {
    const commissionRepo = buildFakeCommissionRepo({
      findActiveByOrgAndUser: jest.fn().mockResolvedValue(buildCommission()),
      supersede: jest
        .fn()
        .mockResolvedValue(buildCommission({ percent: "20.00" })),
    });
    const orgRepo = buildFakeOrgRepo();
    const memberRepo = buildFakeMemberRepo();
    const auditService = buildFakeAuditService();
    const useCase = new UpsertMemberCommissionsUseCase(
      commissionRepo,
      orgRepo,
      memberRepo,
      auditService,
    );

    await useCase.execute({
      orgId: "org-1",
      authId: "owner-1",
      commissions: [{ userId: "user-1", percent: "20.00", mode: "gross" }],
    });

    expect(commissionRepo.supersede).toHaveBeenCalledTimes(1);
    expect(commissionRepo.supersede).toHaveBeenCalledWith({
      orgId: "org-1",
      userId: "user-1",
      percent: "20.00",
      mode: "gross",
      createdBy: "owner-1",
    });
    expect(auditService.logByAuthId).toHaveBeenCalledTimes(1);
    expect(auditService.logByAuthId).toHaveBeenCalledWith("owner-1", {
      orgId: "org-1",
      action: "cashier_commissions_updated",
      entityType: "member_commissions",
      entityId: "org-1",
      metadata: {
        changes: [
          {
            userId: "user-1",
            previousPercent: "10.00",
            previousMode: "gross",
            percent: "20.00",
            mode: "gross",
          },
        ],
      },
    });
  });

  it("não chama supersede quando os valores enviados são idênticos aos vigentes", async () => {
    const commissionRepo = buildFakeCommissionRepo({
      findActiveByOrgAndUser: jest.fn().mockResolvedValue(buildCommission()),
    });
    const orgRepo = buildFakeOrgRepo();
    const memberRepo = buildFakeMemberRepo();
    const auditService = buildFakeAuditService();
    const useCase = new UpsertMemberCommissionsUseCase(
      commissionRepo,
      orgRepo,
      memberRepo,
      auditService,
    );

    await useCase.execute({
      orgId: "org-1",
      authId: "owner-1",
      commissions: [{ userId: "user-1", percent: "10.00", mode: "gross" }],
    });

    expect(commissionRepo.supersede).not.toHaveBeenCalled();
    expect(auditService.logByAuthId).not.toHaveBeenCalled();
  });

  it("lança CommissionMemberNotFoundException quando userId não pertence à organização, sem chamar supersede para nenhum item do payload", async () => {
    const commissionRepo = buildFakeCommissionRepo();
    const orgRepo = buildFakeOrgRepo();
    const memberRepo = buildFakeMemberRepo({
      findAllByOrg: jest
        .fn()
        .mockResolvedValue([buildMember({ userId: "user-1" })]),
    });
    const auditService = buildFakeAuditService();
    const useCase = new UpsertMemberCommissionsUseCase(
      commissionRepo,
      orgRepo,
      memberRepo,
      auditService,
    );

    await expect(
      useCase.execute({
        orgId: "org-1",
        authId: "owner-1",
        commissions: [
          { userId: "user-1", percent: "15.00", mode: "gross" },
          { userId: "user-outsider", percent: "15.00", mode: "gross" },
        ],
      }),
    ).rejects.toBeInstanceOf(CommissionMemberNotFoundException);
    expect(commissionRepo.findActiveByOrgAndUser).not.toHaveBeenCalled();
    expect(commissionRepo.supersede).not.toHaveBeenCalled();
  });

  it("lança CommissionMemberNotFoundException quando userId pertence a membro desativado da org, sem chamar supersede", async () => {
    const commissionRepo = buildFakeCommissionRepo();
    const orgRepo = buildFakeOrgRepo();
    const memberRepo = buildFakeMemberRepo({
      findAllByOrg: jest
        .fn()
        .mockResolvedValue([buildMember({ userId: "user-1", enabled: false })]),
    });
    const auditService = buildFakeAuditService();
    const useCase = new UpsertMemberCommissionsUseCase(
      commissionRepo,
      orgRepo,
      memberRepo,
      auditService,
    );

    await expect(
      useCase.execute({
        orgId: "org-1",
        authId: "owner-1",
        commissions: [{ userId: "user-1", percent: "15.00", mode: "gross" }],
      }),
    ).rejects.toBeInstanceOf(CommissionMemberNotFoundException);
    expect(commissionRepo.findActiveByOrgAndUser).not.toHaveBeenCalled();
    expect(commissionRepo.supersede).not.toHaveBeenCalled();
    expect(auditService.logByAuthId).not.toHaveBeenCalled();
  });

  it('não chama supersede quando o percent enviado difere apenas em formatação decimal do vigente ("50" vs "50.00")', async () => {
    const commissionRepo = buildFakeCommissionRepo({
      findActiveByOrgAndUser: jest
        .fn()
        .mockResolvedValue(buildCommission({ percent: "50.00" })),
    });
    const orgRepo = buildFakeOrgRepo();
    const memberRepo = buildFakeMemberRepo();
    const auditService = buildFakeAuditService();
    const useCase = new UpsertMemberCommissionsUseCase(
      commissionRepo,
      orgRepo,
      memberRepo,
      auditService,
    );

    await useCase.execute({
      orgId: "org-1",
      authId: "owner-1",
      commissions: [{ userId: "user-1", percent: "50", mode: "gross" }],
    });

    expect(commissionRepo.supersede).not.toHaveBeenCalled();
    expect(auditService.logByAuthId).not.toHaveBeenCalled();
  });
});
