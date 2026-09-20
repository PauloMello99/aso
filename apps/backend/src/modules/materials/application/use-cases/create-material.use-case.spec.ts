import { CreateMaterialUseCase } from "./create-material.use-case";
import { IMaterialRepository } from "../../domain/material.repository.interface";
import { MaterialEntity } from "../../domain/material.entity";
import { MaterialServiceTypeInvalidException } from "../../domain/exceptions/material-service-type-invalid.exception";

function buildMaterial(
  overrides: Partial<Parameters<typeof MaterialEntity.create>[0]> = {},
): MaterialEntity {
  return MaterialEntity.create({
    id: "mat-1",
    orgId: "org-1",
    categoryId: null,
    name: "Tinta preta",
    stockQuantity: "0.00",
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
    findPageByOrg: jest.fn(),
    findOptionsByOrg: jest.fn(),
    create: jest.fn().mockResolvedValue(buildMaterial()),
    update: jest.fn(),
    updateStockQuantity: jest.fn(),
    touchLastUsed: jest.fn(),
    setArchived: jest.fn(),
    isLinkedToService: jest.fn(),
    delete: jest.fn(),
    findServiceTypeIdsByMaterial: jest.fn(),
    setServiceTypes: jest.fn(),
    countServiceTypesInOrg: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<IMaterialRepository>;
}

describe("CreateMaterialUseCase", () => {
  it("sem serviceTypeIds, não chama countServiceTypesInOrg nem setServiceTypes", async () => {
    const materialRepo = buildFakeMaterialRepo();
    const useCase = new CreateMaterialUseCase(materialRepo);

    await useCase.execute({ orgId: "org-1", name: "Tinta preta" });

    expect(materialRepo.countServiceTypesInOrg).not.toHaveBeenCalled();
    expect(materialRepo.setServiceTypes).not.toHaveBeenCalled();
  });

  it("com serviceTypeIds válidos (count === length), chama setServiceTypes com (id, orgId, ids)", async () => {
    const created = buildMaterial();
    const materialRepo = buildFakeMaterialRepo({
      create: jest.fn().mockResolvedValue(created),
      countServiceTypesInOrg: jest.fn().mockResolvedValue(2),
    });
    const useCase = new CreateMaterialUseCase(materialRepo);
    const serviceTypeIds = ["svc-1", "svc-2"];

    await useCase.execute({
      orgId: "org-1",
      name: "Tinta preta",
      serviceTypeIds,
    });

    expect(materialRepo.countServiceTypesInOrg).toHaveBeenCalledWith(
      "org-1",
      serviceTypeIds,
    );
    expect(materialRepo.setServiceTypes).toHaveBeenCalledWith(
      created.id,
      "org-1",
      serviceTypeIds,
    );
  });

  it("com serviceTypeIds inválidos (count menor), rejeita e não chama setServiceTypes", async () => {
    const materialRepo = buildFakeMaterialRepo({
      countServiceTypesInOrg: jest.fn().mockResolvedValue(1),
    });
    const useCase = new CreateMaterialUseCase(materialRepo);
    const serviceTypeIds = ["svc-1", "svc-2"];

    await expect(
      useCase.execute({
        orgId: "org-1",
        name: "Tinta preta",
        serviceTypeIds,
      }),
    ).rejects.toThrow(MaterialServiceTypeInvalidException);

    expect(materialRepo.setServiceTypes).not.toHaveBeenCalled();
  });
});
