import { ListMaterialsPageUseCase } from "./list-materials-page.use-case";
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
    findPageByOrg: jest.fn().mockResolvedValue({ rows: [], total: 0 }),
    findOptionsByOrg: jest.fn(),
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

describe("ListMaterialsPageUseCase", () => {
  it("sem authId, fail-closed: chave costPerUnit ausente", async () => {
    const materialRepo = buildFakeMaterialRepo({
      findPageByOrg: jest
        .fn()
        .mockResolvedValue({ rows: [buildMaterial()], total: 1 }),
    });
    const memberRepo = buildFakeMemberRepo();
    const useCase = new ListMaterialsPageUseCase(materialRepo, memberRepo);

    const result = await useCase.execute("org-1");

    expect("costPerUnit" in result.data[0]).toBe(false);
    expect(memberRepo.findByAuthId).not.toHaveBeenCalled();
  });

  it("employee com permissão stock recebe costPerUnit normalmente", async () => {
    const materialRepo = buildFakeMaterialRepo({
      findPageByOrg: jest
        .fn()
        .mockResolvedValue({ rows: [buildMaterial()], total: 1 }),
    });
    const memberRepo = buildFakeMemberRepo({
      findByAuthId: jest
        .fn()
        .mockResolvedValue(
          buildMember({ role: "employee", permissions: ["stock"] }),
        ),
    });
    const useCase = new ListMaterialsPageUseCase(materialRepo, memberRepo);

    const result = await useCase.execute("org-1", undefined, "auth-1");

    expect(result.data[0].costPerUnit).toBe("50.00");
  });

  it("employee sem permissão stock recebe itens sem a chave costPerUnit", async () => {
    const materialRepo = buildFakeMaterialRepo({
      findPageByOrg: jest
        .fn()
        .mockResolvedValue({ rows: [buildMaterial()], total: 1 }),
    });
    const memberRepo = buildFakeMemberRepo({
      findByAuthId: jest
        .fn()
        .mockResolvedValue(buildMember({ role: "employee", permissions: [] })),
    });
    const useCase = new ListMaterialsPageUseCase(materialRepo, memberRepo);

    const result = await useCase.execute("org-1", undefined, "auth-1");

    expect("costPerUnit" in result.data[0]).toBe(false);
  });

  it("neutraliza minCost/maxCost antes de chamar o repositório quando não pode ver custo", async () => {
    const materialRepo = buildFakeMaterialRepo();
    const memberRepo = buildFakeMemberRepo({
      findByAuthId: jest
        .fn()
        .mockResolvedValue(buildMember({ role: "employee", permissions: [] })),
    });
    const useCase = new ListMaterialsPageUseCase(materialRepo, memberRepo);

    await useCase.execute(
      "org-1",
      { minCost: "10", maxCost: "100" },
      "auth-1",
    );

    expect(materialRepo.findPageByOrg).toHaveBeenCalledWith(
      "org-1",
      expect.objectContaining({ minCost: undefined, maxCost: undefined }),
      { limit: 50, offset: 0 },
    );
  });

  it("owner recebe filtro intacto (minCost/maxCost preservados)", async () => {
    const materialRepo = buildFakeMaterialRepo();
    const memberRepo = buildFakeMemberRepo({
      findByAuthId: jest
        .fn()
        .mockResolvedValue(buildMember({ role: "owner" })),
    });
    const useCase = new ListMaterialsPageUseCase(materialRepo, memberRepo);

    const filter = { minCost: "10", maxCost: "100" };
    await useCase.execute("org-1", filter, "auth-1");

    expect(materialRepo.findPageByOrg).toHaveBeenCalledWith(
      "org-1",
      filter,
      { limit: 50, offset: 0 },
    );
  });

  it("usa page=1 e limit=50 por padrão quando nenhum é informado", async () => {
    const materialRepo = buildFakeMaterialRepo();
    const memberRepo = buildFakeMemberRepo();
    const useCase = new ListMaterialsPageUseCase(materialRepo, memberRepo);

    const result = await useCase.execute("org-1");

    expect(materialRepo.findPageByOrg).toHaveBeenCalledWith(
      "org-1",
      undefined,
      { limit: 50, offset: 0 },
    );
    expect(result).toEqual({ data: [], total: 0, page: 1, pages: 0 });
  });

  it("clampa limit acima do máximo para 200", async () => {
    const materialRepo = buildFakeMaterialRepo();
    const memberRepo = buildFakeMemberRepo();
    const useCase = new ListMaterialsPageUseCase(materialRepo, memberRepo);

    await useCase.execute("org-1", undefined, undefined, 1, 500);

    expect(materialRepo.findPageByOrg).toHaveBeenCalledWith(
      "org-1",
      undefined,
      { limit: 200, offset: 0 },
    );
  });

  it("trata page=0 ou negativo como 1", async () => {
    const materialRepo = buildFakeMaterialRepo();
    const memberRepo = buildFakeMemberRepo();
    const useCase = new ListMaterialsPageUseCase(materialRepo, memberRepo);

    await useCase.execute("org-1", undefined, undefined, 0);
    await useCase.execute("org-1", undefined, undefined, -3);

    expect(materialRepo.findPageByOrg).toHaveBeenNthCalledWith(
      1,
      "org-1",
      undefined,
      { limit: 50, offset: 0 },
    );
    expect(materialRepo.findPageByOrg).toHaveBeenNthCalledWith(
      2,
      "org-1",
      undefined,
      { limit: 50, offset: 0 },
    );
  });

  it("calcula pages corretamente (Math.ceil(total/limit)) e 0 quando total=0", async () => {
    const materialRepo = buildFakeMaterialRepo({
      findPageByOrg: jest
        .fn()
        .mockResolvedValue({ rows: [buildMaterial()], total: 101 }),
    });
    const memberRepo = buildFakeMemberRepo();
    const useCase = new ListMaterialsPageUseCase(materialRepo, memberRepo);

    const result = await useCase.execute("org-1", undefined, undefined, 1, 50);

    expect(result.total).toBe(101);
    expect(result.pages).toBe(3);

    const emptyRepo = buildFakeMaterialRepo({
      findPageByOrg: jest.fn().mockResolvedValue({ rows: [], total: 0 }),
    });
    const emptyUseCase = new ListMaterialsPageUseCase(emptyRepo, memberRepo);

    const emptyResult = await emptyUseCase.execute("org-1");

    expect(emptyResult.pages).toBe(0);
  });
});
