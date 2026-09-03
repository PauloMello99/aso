import { UpdateMemberClassificationUseCase } from "./update-member-classification.use-case";
import { IOrganizationRepository } from "../../domain/org.repository.interface";
import { IMemberRepository } from "../../domain/member.repository.interface";
import type { MemberClassification } from "../../domain/member.entity";
import { MemberEntity } from "../../domain/member.entity";
import { OrgForbiddenException } from "../../domain/exceptions/org-forbidden.exception";
import { MemberNotFoundException } from "../../domain/exceptions/member-not-found.exception";
import { AuditService } from "../../../audit/audit.service";

function buildMember(
  overrides: Partial<Parameters<typeof MemberEntity.create>[0]> = {},
): MemberEntity {
  return MemberEntity.create({
    memberId: "member-1",
    orgId: "org-1",
    userId: "user-1",
    role: "employee",
    classification: null,
    enabled: true,
    permissions: [],
    userName: "Fulano",
    userEmail: "fulano@example.com",
    joinedAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  });
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
    findAllByOrg: jest.fn(),
    upsert: jest.fn(),
    findByMemberId: jest.fn().mockResolvedValue(buildMember()),
    findByAuthId: jest.fn(),
    updateRole: jest.fn(),
    updatePermissions: jest.fn(),
    updateClassification: jest
      .fn()
      .mockImplementation((memberId: string, classification: MemberClassification | null) =>
        Promise.resolve(buildMember({ memberId, classification })),
      ),
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
    log: jest.fn().mockResolvedValue(undefined),
    logByAuthId: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as jest.Mocked<AuditService>;
}

interface Deps {
  orgRepo: jest.Mocked<IOrganizationRepository>;
  memberRepo: jest.Mocked<IMemberRepository>;
  auditService: jest.Mocked<AuditService>;
}

function buildUseCase(overrides: Partial<Deps> = {}) {
  const deps: Deps = {
    orgRepo: buildFakeOrgRepo(),
    memberRepo: buildFakeMemberRepo(),
    auditService: buildFakeAuditService(),
    ...overrides,
  };

  const useCase = new UpdateMemberClassificationUseCase(
    deps.orgRepo,
    deps.memberRepo,
    deps.auditService,
  );

  return { useCase, ...deps };
}

describe("UpdateMemberClassificationUseCase", () => {
  it("lança OrgForbiddenException e não grava quando quem chama não é owner", async () => {
    const { useCase, memberRepo, auditService } = buildUseCase({
      orgRepo: buildFakeOrgRepo({ isOwner: jest.fn().mockResolvedValue(false) }),
    });

    await expect(
      useCase.execute("org-1", "member-1", "auth-1", "resident"),
    ).rejects.toBeInstanceOf(OrgForbiddenException);
    expect(memberRepo.updateClassification).not.toHaveBeenCalled();
    expect(auditService.logByAuthId).not.toHaveBeenCalled();
  });

  it("lança MemberNotFoundException e não grava quando o membro não existe", async () => {
    const { useCase, memberRepo, auditService } = buildUseCase({
      memberRepo: buildFakeMemberRepo({
        findByMemberId: jest.fn().mockResolvedValue(null),
      }),
    });

    await expect(
      useCase.execute("org-1", "member-1", "auth-1", "resident"),
    ).rejects.toBeInstanceOf(MemberNotFoundException);
    expect(memberRepo.updateClassification).not.toHaveBeenCalled();
    expect(auditService.logByAuthId).not.toHaveBeenCalled();
  });

  it("owner grava a classificação 'resident' e audita", async () => {
    const { useCase, memberRepo, auditService } = buildUseCase();

    const updated = await useCase.execute(
      "org-1",
      "member-1",
      "auth-1",
      "resident",
    );

    expect(memberRepo.updateClassification).toHaveBeenCalledWith(
      "member-1",
      "resident",
    );
    expect(updated.classification).toBe("resident");
    expect(auditService.logByAuthId).toHaveBeenCalledWith("auth-1", {
      orgId: "org-1",
      action: "update",
      entityType: "org_membership",
      entityId: "member-1",
      metadata: { memberId: "member-1", classification: "resident" },
    });
  });

  it("owner limpa o rótulo gravando null e audita", async () => {
    const { useCase, memberRepo, auditService } = buildUseCase();

    const updated = await useCase.execute("org-1", "member-1", "auth-1", null);

    expect(memberRepo.updateClassification).toHaveBeenCalledWith(
      "member-1",
      null,
    );
    expect(updated.classification).toBeNull();
    expect(auditService.logByAuthId).toHaveBeenCalledWith("auth-1", {
      orgId: "org-1",
      action: "update",
      entityType: "org_membership",
      entityId: "member-1",
      metadata: { memberId: "member-1", classification: null },
    });
  });
});
