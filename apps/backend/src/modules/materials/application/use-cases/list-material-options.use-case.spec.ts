import { ListMaterialOptionsUseCase } from "./list-material-options.use-case";
import { IMaterialRepository } from "../../domain/material.repository.interface";
import { MaterialEntity } from "../../domain/material.entity";
import { IMemberRepository } from "../../../organizations/domain/member.repository.interface";
import { MemberEntity } from "../../../organizations/domain/member.entity";

const MAX_OPTIONS = 1000;

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

function buildMaterials(count: number): MaterialEntity[] {
  return Array.from({ length: count }, (_, i) =>
    buildMaterial({ id: `mat-${i}` }),
  );
}

function buildFakeMaterialRepo(
  overrides: Partial<jest.Mocked<IMaterialRepository>> = {},
): jest.Mocked<IMaterialRepository> {
  return {
    findById: jest.fn(),
    findAllByOrg: jest.fn(),
    findPageByOrg: jest.fn(),
    findOptionsByOrg: jest.fn().mockResolvedValue([]),
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

describe("ListMaterialOptionsUseCase", () => {
  it("sem authId, fail-closed: chave costPerUnit ausente", async () => {
    const materialRepo = buildFakeMaterialRepo({
      findOptionsByOrg: jest.fn().mockResolvedValue([buildMaterial()]),
    });
    const memberRepo = buildFakeMemberRepo();
    const useCase = new ListMaterialOptionsUseCase(materialRepo, memberRepo);

    const result = await useCase.execute("org-1");

    expect("costPerUnit" in result.data[0]).toBe(false);
    expect(memberRepo.findByAuthId).not.toHaveBeenCalled();
  });

  it("employee sem permissão stock recebe itens sem a chave costPerUnit", async () => {
    const materialRepo = buildFakeMaterialRepo({
      findOptionsByOrg: jest.fn().mockResolvedValue([buildMaterial()]),
    });
    const memberRepo = buildFakeMemberRepo({
      findByAuthId: jest
        .fn()
        .mockResolvedValue(buildMember({ role: "employee", permissions: [] })),
    });
    const useCase = new ListMaterialOptionsUseCase(materialRepo, memberRepo);

    const result = await useCase.execute("org-1", "auth-1");

    expect("costPerUnit" in result.data[0]).toBe(false);
  });

  it("employee com permissão stock recebe costPerUnit normalmente", async () => {
    const materialRepo = buildFakeMaterialRepo({
      findOptionsByOrg: jest.fn().mockResolvedValue([buildMaterial()]),
    });
    const memberRepo = buildFakeMemberRepo({
      findByAuthId: jest
        .fn()
        .mockResolvedValue(
          buildMember({ role: "employee", permissions: ["stock"] }),
        ),
    });
    const useCase = new ListMaterialOptionsUseCase(materialRepo, memberRepo);

    const result = await useCase.execute("org-1", "auth-1");

    expect(result.data[0].costPerUnit).toBe("50.00");
  });

  it("owner recebe costPerUnit presente", async () => {
    const materialRepo = buildFakeMaterialRepo({
      findOptionsByOrg: jest.fn().mockResolvedValue([buildMaterial()]),
    });
    const memberRepo = buildFakeMemberRepo({
      findByAuthId: jest
        .fn()
        .mockResolvedValue(buildMember({ role: "owner" })),
    });
    const useCase = new ListMaterialOptionsUseCase(materialRepo, memberRepo);

    const result = await useCase.execute("org-1", "auth-1");

    expect(result.data[0].costPerUnit).toBe("50.00");
  });

  it("solicita MAX_OPTIONS + 1 e trunca quando o repositório retorna o limite excedido", async () => {
    const materialRepo = buildFakeMaterialRepo({
      findOptionsByOrg: jest
        .fn()
        .mockResolvedValue(buildMaterials(MAX_OPTIONS + 1)),
    });
    const memberRepo = buildFakeMemberRepo();
    const useCase = new ListMaterialOptionsUseCase(materialRepo, memberRepo);

    const result = await useCase.execute("org-1");

    expect(materialRepo.findOptionsByOrg).toHaveBeenCalledWith("org-1", {
      limit: MAX_OPTIONS,
    });
    expect(result.data).toHaveLength(MAX_OPTIONS);
    expect(result.truncated).toBe(true);
  });

  it("não trunca quando o repositório retorna exatamente MAX_OPTIONS linhas", async () => {
    const materialRepo = buildFakeMaterialRepo({
      findOptionsByOrg: jest.fn().mockResolvedValue(buildMaterials(MAX_OPTIONS)),
    });
    const memberRepo = buildFakeMemberRepo();
    const useCase = new ListMaterialOptionsUseCase(materialRepo, memberRepo);

    const result = await useCase.execute("org-1");

    expect(result.data).toHaveLength(MAX_OPTIONS);
    expect(result.truncated).toBe(false);
  });

  it("não trunca quando há poucas linhas", async () => {
    const materialRepo = buildFakeMaterialRepo({
      findOptionsByOrg: jest.fn().mockResolvedValue(buildMaterials(3)),
    });
    const memberRepo = buildFakeMemberRepo();
    const useCase = new ListMaterialOptionsUseCase(materialRepo, memberRepo);

    const result = await useCase.execute("org-1");

    expect(result.data).toHaveLength(3);
    expect(result.truncated).toBe(false);
  });
});
