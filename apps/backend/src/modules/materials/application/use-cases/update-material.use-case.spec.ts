import { UpdateMaterialUseCase } from "./update-material.use-case";
import { IMaterialRepository } from "../../domain/material.repository.interface";
import { MaterialEntity } from "../../domain/material.entity";
import { MaterialNotFoundException } from "../../domain/exceptions/material-not-found.exception";
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
    findById: jest.fn().mockResolvedValue(buildMaterial()),
    findAllByOrg: jest.fn(),
    findPageByOrg: jest.fn(),
    findOptionsByOrg: jest.fn(),
    create: jest.fn(),
    update: jest.fn().mockResolvedValue(buildMaterial()),
    updateStockQuantity: jest.fn(),
    touchLastUsed: jest.fn(),
    setArchived: jest.fn(),
    isLinkedToService: jest.fn(),
    delete: jest.fn(),
    findServiceTypeIdsByMaterial: jest.fn().mockResolvedValue([]),
    setServiceTypes: jest.fn(),
    countServiceTypesInOrg: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<IMaterialRepository>;
}

describe("UpdateMaterialUseCase", () => {
  it("material inexistente lança MaterialNotFoundException antes de qualquer escrita", async () => {
    const materialRepo = buildFakeMaterialRepo({
      findById: jest.fn().mockResolvedValue(null),
    });
    const useCase = new UpdateMaterialUseCase(materialRepo);

    await expect(
      useCase.execute("mat-1", "org-1", { name: "Nova tinta" }),
    ).rejects.toThrow(MaterialNotFoundException);

    expect(materialRepo.setServiceTypes).not.toHaveBeenCalled();
    expect(materialRepo.update).not.toHaveBeenCalled();
  });

  it("serviceTypeIds: [] chama setServiceTypes com array vazio", async () => {
    const materialRepo = buildFakeMaterialRepo();
    const useCase = new UpdateMaterialUseCase(materialRepo);

    await useCase.execute("mat-1", "org-1", { serviceTypeIds: [] });

    expect(materialRepo.setServiceTypes).toHaveBeenCalledWith(
      "mat-1",
      "org-1",
      [],
    );
    expect(materialRepo.countServiceTypesInOrg).not.toHaveBeenCalled();
  });

  it("serviceTypeIds: undefined não chama setServiceTypes", async () => {
    const materialRepo = buildFakeMaterialRepo();
    const useCase = new UpdateMaterialUseCase(materialRepo);

    await useCase.execute("mat-1", "org-1", { name: "Nova tinta" });

    expect(materialRepo.setServiceTypes).not.toHaveBeenCalled();
  });

  it("serviceTypeIds inválidos (count menor) rejeita e não chama setServiceTypes", async () => {
    const materialRepo = buildFakeMaterialRepo({
      countServiceTypesInOrg: jest.fn().mockResolvedValue(1),
    });
    const useCase = new UpdateMaterialUseCase(materialRepo);

    await expect(
      useCase.execute("mat-1", "org-1", {
        serviceTypeIds: ["svc-1", "svc-2"],
      }),
    ).rejects.toThrow(MaterialServiceTypeInvalidException);

    expect(materialRepo.setServiceTypes).not.toHaveBeenCalled();
  });
});
