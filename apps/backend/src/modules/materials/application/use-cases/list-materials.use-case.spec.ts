import { ListMaterialsUseCase } from "./list-materials.use-case";
import { IMaterialRepository } from "../../domain/material.repository.interface";
import { MaterialEntity } from "../../domain/material.entity";
import { IMemberRepository } from "../../../organizations/domain/member.repository.interface";
import { MemberEntity } from "../../../organizations/domain/member.entity";

function buildMaterial(
  overrides: Partial<Parameters<typeof MaterialEntity.create>[0]> = {},
): MaterialEntity {
  return MaterialEntity.create({
    id: "mat-1",
    orgId: "org-1",
    categoryId: null,
    name: "Tinta preta",
    stockQuantity: "10.00",
    minimumQuantity: "2.00",
    costPerUnit: "50.00",
    shareable: false,
    lastUsedAt: null,
    archivedAt: null,
    createdAt: new Date("2026-07-01T10:00:00Z"),
    updatedAt: new Date("2026-07-01T10:00:00Z"),
    ...overrides,
  });
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
    userName: "Funcionário",
    userEmail: "funcionario@example.com",
    joinedAt: new Date("2026-07-01T10:00:00Z"),
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
    setEnabled: jest.fn(),
    countActiveOwners: jest.fn(),
    countOwnedOrgs: jest.fn(),
    removeAllByUserId: jest.fn(),
    transferOwnership: jest.fn(),
    remove: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<IMemberRepository>;
}

describe("ListMaterialsUseCase", () => {
  it("owner recebe costPerUnit presente", async () => {
    const materialRepo = buildFakeMaterialRepo({
      findAllByOrg: jest.fn().mockResolvedValue([buildMaterial()]),
    });
    const memberRepo = buildFakeMemberRepo({
      findByAuthId: jest.fn().mockResolvedValue(buildMember({ role: "owner" })),
    });
    const useCase = new ListMaterialsUseCase(materialRepo, memberRepo);

    const result = await useCase.execute("org-1", undefined, "auth-1");

    expect(result[0].costPerUnit).toBe("50.00");
  });

  it("super_admin sem membership real (membro sintético owner) recebe costPerUnit presente", async () => {
    // Simula o que drizzle-member.repository.ts#findByAuthId faz de verdade: quando o
    // usuário é super_admin mas não tem linha de membership na org, sintetiza um
    // MemberEntity com role "owner" e permissions vazias. Este teste documenta que o
    // caminho de "owner" no use-case cobre corretamente esse cenário sintético também.
    const materialRepo = buildFakeMaterialRepo({
      findAllByOrg: jest.fn().mockResolvedValue([buildMaterial()]),
    });
    const memberRepo = buildFakeMemberRepo({
      findByAuthId: jest.fn().mockResolvedValue(
        buildMember({
          memberId: "super-admin-synthetic",
          role: "owner",
          permissions: [],
        }),
      ),
    });
    const useCase = new ListMaterialsUseCase(materialRepo, memberRepo);

    const result = await useCase.execute("org-1", undefined, "auth-1");

    expect(result[0].costPerUnit).toBe("50.00");
  });

  it("employee sem permissão stock recebe itens sem a chave costPerUnit", async () => {
    const materialRepo = buildFakeMaterialRepo({
      findAllByOrg: jest.fn().mockResolvedValue([buildMaterial()]),
    });
    const memberRepo = buildFakeMemberRepo({
      findByAuthId: jest
        .fn()
        .mockResolvedValue(buildMember({ role: "employee", permissions: [] })),
    });
    const useCase = new ListMaterialsUseCase(materialRepo, memberRepo);

    const result = await useCase.execute("org-1", undefined, "auth-1");

    expect("costPerUnit" in result[0]).toBe(false);
  });

  it("neutraliza minCost/maxCost antes de chamar o repositório quando não pode ver custo", async () => {
    const materialRepo = buildFakeMaterialRepo({
      findAllByOrg: jest.fn().mockResolvedValue([]),
    });
    const memberRepo = buildFakeMemberRepo({
      findByAuthId: jest
        .fn()
        .mockResolvedValue(buildMember({ role: "employee", permissions: [] })),
    });
    const useCase = new ListMaterialsUseCase(materialRepo, memberRepo);

    await useCase.execute(
      "org-1",
      { minCost: "10", maxCost: "100" },
      "auth-1",
    );

    expect(materialRepo.findAllByOrg).toHaveBeenCalledWith(
      "org-1",
      expect.objectContaining({ minCost: undefined, maxCost: undefined }),
    );
  });

  it("employee com permissão stock recebe costPerUnit normalmente", async () => {
    const materialRepo = buildFakeMaterialRepo({
      findAllByOrg: jest.fn().mockResolvedValue([buildMaterial()]),
    });
    const memberRepo = buildFakeMemberRepo({
      findByAuthId: jest
        .fn()
        .mockResolvedValue(
          buildMember({ role: "employee", permissions: ["stock"] }),
        ),
    });
    const useCase = new ListMaterialsUseCase(materialRepo, memberRepo);

    const result = await useCase.execute("org-1", undefined, "auth-1");

    expect(result[0].costPerUnit).toBe("50.00");
  });

  it("sem authId, fail-closed: chave costPerUnit ausente", async () => {
    const materialRepo = buildFakeMaterialRepo({
      findAllByOrg: jest.fn().mockResolvedValue([buildMaterial()]),
    });
    const memberRepo = buildFakeMemberRepo();
    const useCase = new ListMaterialsUseCase(materialRepo, memberRepo);

    const result = await useCase.execute("org-1");

    expect("costPerUnit" in result[0]).toBe(false);
    expect(memberRepo.findByAuthId).not.toHaveBeenCalled();
  });
});
