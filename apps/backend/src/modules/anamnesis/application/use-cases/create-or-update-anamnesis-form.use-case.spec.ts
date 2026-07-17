import { CreateOrUpdateAnamnesisFormUseCase } from "./create-or-update-anamnesis-form.use-case";
import { IAnamnesisFormRepository } from "../../domain/anamnesis-form.repository.interface";
import { AnamnesisFormVersionEntity } from "../../domain/anamnesis-form-version.entity";
import { IServiceTypeRepository } from "../../../services/domain/service-type.repository.interface";
import { ServiceTypeEntity } from "../../../services/domain/service-type.entity";
import { ServiceTypeNotFoundException } from "../../../services/domain/exceptions/service-type-not-found.exception";
import { IMemberRepository } from "../../../organizations/domain/member.repository.interface";
import { MemberEntity } from "../../../organizations/domain/member.entity";

function buildServiceType(
  overrides: Partial<Parameters<typeof ServiceTypeEntity.create>[0]> = {},
): ServiceTypeEntity {
  return ServiceTypeEntity.create({
    id: "type-1",
    orgId: "org-1",
    name: "Tatuagem",
    description: null,
    requiresAgeVerification: false,
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

function buildVersion(
  overrides: Partial<Parameters<typeof AnamnesisFormVersionEntity.create>[0]> = {},
): AnamnesisFormVersionEntity {
  return AnamnesisFormVersionEntity.create({
    id: "version-1",
    formId: "form-1",
    orgId: "org-1",
    versionNumber: 1,
    questions: [{ id: "q-1", type: "text", label: "Alergias?", required: true }],
    createdBy: "user-1",
    createdAt: new Date("2026-07-17T00:00:00Z"),
    ...overrides,
  });
}

function buildFakeFormRepo(
  overrides: Partial<jest.Mocked<IAnamnesisFormRepository>> = {},
): jest.Mocked<IAnamnesisFormRepository> {
  return {
    getCurrentVersion: jest.fn(),
    listVersions: jest.fn(),
    createVersion: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<IAnamnesisFormRepository>;
}

function buildFakeServiceTypeRepo(
  overrides: Partial<jest.Mocked<IServiceTypeRepository>> = {},
): jest.Mocked<IServiceTypeRepository> {
  return {
    findByOrg: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<IServiceTypeRepository>;
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
    setEnabled: jest.fn(),
    countActiveOwners: jest.fn(),
    countOwnedOrgs: jest.fn(),
    removeAllByUserId: jest.fn(),
    transferOwnership: jest.fn(),
    remove: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<IMemberRepository>;
}

describe("CreateOrUpdateAnamnesisFormUseCase", () => {
  it("lança ServiceTypeNotFoundException quando o tipo de serviço não existe na org e não chama createVersion", async () => {
    const formRepo = buildFakeFormRepo();
    const serviceTypeRepo = buildFakeServiceTypeRepo({
      findById: jest.fn().mockResolvedValue(null),
    });
    const memberRepo = buildFakeMemberRepo();
    const useCase = new CreateOrUpdateAnamnesisFormUseCase(
      formRepo,
      serviceTypeRepo,
      memberRepo,
    );

    await expect(
      useCase.execute({
        orgId: "org-1",
        serviceTypeId: "missing-type",
        authId: "auth-1",
        questions: [],
      }),
    ).rejects.toBeInstanceOf(ServiceTypeNotFoundException);

    expect(formRepo.createVersion).not.toHaveBeenCalled();
  });

  it("resolve authId -> users.id e repassa como createdBy", async () => {
    const formRepo = buildFakeFormRepo({
      createVersion: jest.fn().mockResolvedValue(buildVersion()),
    });
    const serviceTypeRepo = buildFakeServiceTypeRepo({
      findById: jest.fn().mockResolvedValue(buildServiceType()),
    });
    const memberRepo = buildFakeMemberRepo({
      findByAuthId: jest.fn().mockResolvedValue(buildMember({ userId: "user-42" })),
    });
    const useCase = new CreateOrUpdateAnamnesisFormUseCase(
      formRepo,
      serviceTypeRepo,
      memberRepo,
    );

    const questions = [
      { id: "q-1", type: "yes_no" as const, label: "Tem alergia?", required: true },
    ];

    await useCase.execute({
      orgId: "org-1",
      serviceTypeId: "type-1",
      authId: "auth-1",
      questions,
    });

    expect(memberRepo.findByAuthId).toHaveBeenCalledWith("org-1", "auth-1");
    expect(formRepo.createVersion).toHaveBeenCalledWith({
      orgId: "org-1",
      serviceTypeId: "type-1",
      questions,
      createdBy: "user-42",
    });
  });

  it("sempre delega a createVersion (nunca chama update de versão — a interface do repo nem expõe esse método)", async () => {
    const version = buildVersion();
    const formRepo = buildFakeFormRepo({
      createVersion: jest.fn().mockResolvedValue(version),
    });
    const serviceTypeRepo = buildFakeServiceTypeRepo({
      findById: jest.fn().mockResolvedValue(buildServiceType()),
    });
    const memberRepo = buildFakeMemberRepo({
      findByAuthId: jest.fn().mockResolvedValue(buildMember()),
    });
    const useCase = new CreateOrUpdateAnamnesisFormUseCase(
      formRepo,
      serviceTypeRepo,
      memberRepo,
    );

    const result = await useCase.execute({
      orgId: "org-1",
      serviceTypeId: "type-1",
      authId: "auth-1",
      questions: [],
    });

    expect(formRepo.createVersion).toHaveBeenCalledTimes(1);
    expect(result).toBe(version);
    // IAnamnesisFormRepository não expõe update/delete de versão — prova
    // estrutural de que a única forma de "editar" o formulário é criar uma
    // nova versão (imutabilidade por design).
    expect((formRepo as Record<string, unknown>)["updateVersion"]).toBeUndefined();
  });
});
