import { GetMemberCommissionsUseCase } from "./get-member-commissions.use-case";
import { IMemberCommissionRepository } from "../../domain/member-commission.repository.interface";
import { MemberCommissionEntity } from "../../domain/member-commission.entity";
import { IMemberRepository } from "../../../organizations/domain/member.repository.interface";
import { MemberEntity } from "../../../organizations/domain/member.entity";
import { CashierForbiddenException } from "../../domain/exceptions/cashier-forbidden.exception";

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

function buildFakeMemberRepo(
  overrides: Partial<jest.Mocked<IMemberRepository>> = {},
): jest.Mocked<IMemberRepository> {
  return {
    findAllByOrg: jest.fn().mockResolvedValue([]),
    upsert: jest.fn(),
    findByMemberId: jest.fn(),
    findByAuthId: jest.fn().mockResolvedValue(null),
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

describe("GetMemberCommissionsUseCase", () => {
  it("owner: retorna a lista completa de todos os membros da org", async () => {
    const owner = buildMember({ userId: "owner-1", role: "owner" });
    const employee1 = buildMember({ userId: "user-1", role: "employee" });
    const employee2 = buildMember({
      memberId: "member-2",
      userId: "user-2",
      role: "employee",
      userName: "Ciclano",
    });
    const memberRepo = buildFakeMemberRepo({
      findByAuthId: jest.fn().mockResolvedValue(owner),
      findAllByOrg: jest.fn().mockResolvedValue([owner, employee1, employee2]),
    });
    const commissionRepo = buildFakeCommissionRepo({
      findActiveByOrg: jest
        .fn()
        .mockResolvedValue([buildCommission({ userId: "user-1" })]),
    });
    const useCase = new GetMemberCommissionsUseCase(commissionRepo, memberRepo);

    const result = await useCase.execute({ orgId: "org-1", authId: "auth-owner" });

    expect(result).toHaveLength(3);
    expect(result.map((r) => r.userId).sort()).toEqual(
      ["owner-1", "user-1", "user-2"].sort(),
    );
  });

  it("employee: retorna somente a própria linha, nunca a de colegas", async () => {
    const owner = buildMember({ userId: "owner-1", role: "owner" });
    const employee1 = buildMember({ userId: "user-1", role: "employee" });
    const employee2 = buildMember({
      memberId: "member-2",
      userId: "user-2",
      role: "employee",
      userName: "Ciclano",
    });
    const memberRepo = buildFakeMemberRepo({
      findByAuthId: jest.fn().mockResolvedValue(employee1),
      findAllByOrg: jest.fn().mockResolvedValue([owner, employee1, employee2]),
    });
    const commissionRepo = buildFakeCommissionRepo({
      findActiveByOrg: jest
        .fn()
        .mockResolvedValue([
          buildCommission({ userId: "user-1", percent: "15.00" }),
          buildCommission({ userId: "user-2", percent: "30.00" }),
        ]),
    });
    const useCase = new GetMemberCommissionsUseCase(commissionRepo, memberRepo);

    const result = await useCase.execute({ orgId: "org-1", authId: "auth-1" });

    expect(result).toHaveLength(1);
    expect(result).toEqual([
      expect.objectContaining({ userId: "user-1", percent: "15.00" }),
    ]);
  });

  it("lança CashierForbiddenException quando o ator não é membro da org", async () => {
    const memberRepo = buildFakeMemberRepo({
      findByAuthId: jest.fn().mockResolvedValue(null),
    });
    const commissionRepo = buildFakeCommissionRepo();
    const useCase = new GetMemberCommissionsUseCase(commissionRepo, memberRepo);

    await expect(
      useCase.execute({ orgId: "org-1", authId: "stranger" }),
    ).rejects.toBeInstanceOf(CashierForbiddenException);
  });
});
