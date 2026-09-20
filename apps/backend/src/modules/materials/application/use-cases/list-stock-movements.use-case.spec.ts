import { ListStockMovementsUseCase } from "./list-stock-movements.use-case";
import { IMaterialRepository } from "../../domain/material.repository.interface";
import { MaterialEntity } from "../../domain/material.entity";
import { IStockMovementRepository } from "../../domain/stock-movement.repository.interface";
import { StockMovementEntity } from "../../domain/stock-movement.entity";
import { MaterialNotFoundException } from "../../domain/exceptions/material-not-found.exception";

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

function buildMovement(
  overrides: Partial<Parameters<typeof StockMovementEntity.create>[0]> = {},
): StockMovementEntity {
  return StockMovementEntity.create({
    id: "mov-1",
    orgId: "org-1",
    materialId: "mat-1",
    type: "restock",
    quantityDelta: "5.00",
    serviceId: null,
    note: null,
    createdBy: null,
    createdAt: new Date("2026-07-01T10:00:00Z"),
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
    update: jest.fn(),
    updateStockQuantity: jest.fn(),
    touchLastUsed: jest.fn(),
    setArchived: jest.fn(),
    isLinkedToService: jest.fn(),
    delete: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<IMaterialRepository>;
}

function buildFakeMovementRepo(
  overrides: Partial<jest.Mocked<IStockMovementRepository>> = {},
): jest.Mocked<IStockMovementRepository> {
  return {
    findPageByMaterial: jest.fn().mockResolvedValue({ rows: [], total: 0 }),
    create: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<IStockMovementRepository>;
}

describe("ListStockMovementsUseCase", () => {
  it("lança MaterialNotFoundException quando o material não existe na org", async () => {
    const materialRepo = buildFakeMaterialRepo({
      findById: jest.fn().mockResolvedValue(null),
    });
    const movementRepo = buildFakeMovementRepo();
    const useCase = new ListStockMovementsUseCase(materialRepo, movementRepo);

    await expect(useCase.execute("mat-1", "org-1")).rejects.toThrow(
      MaterialNotFoundException,
    );
    expect(movementRepo.findPageByMaterial).not.toHaveBeenCalled();
  });

  it("usa page=1 e limit=20 por padrão quando nenhum é informado", async () => {
    const materialRepo = buildFakeMaterialRepo();
    const movementRepo = buildFakeMovementRepo({
      findPageByMaterial: jest
        .fn()
        .mockResolvedValue({ rows: [buildMovement()], total: 1 }),
    });
    const useCase = new ListStockMovementsUseCase(materialRepo, movementRepo);

    const result = await useCase.execute("mat-1", "org-1");

    expect(movementRepo.findPageByMaterial).toHaveBeenCalledWith(
      "mat-1",
      "org-1",
      { limit: 20, offset: 0 },
    );
    expect(result).toEqual({
      data: [buildMovement()],
      total: 1,
      page: 1,
      pages: 1,
    });
  });

  it("clampa limit acima do máximo para 100", async () => {
    const materialRepo = buildFakeMaterialRepo();
    const movementRepo = buildFakeMovementRepo();
    const useCase = new ListStockMovementsUseCase(materialRepo, movementRepo);

    await useCase.execute("mat-1", "org-1", 1, 500);

    expect(movementRepo.findPageByMaterial).toHaveBeenCalledWith(
      "mat-1",
      "org-1",
      { limit: 100, offset: 0 },
    );
  });

  it("trata page=0 ou negativo como 1", async () => {
    const materialRepo = buildFakeMaterialRepo();
    const movementRepo = buildFakeMovementRepo();
    const useCase = new ListStockMovementsUseCase(materialRepo, movementRepo);

    await useCase.execute("mat-1", "org-1", 0);
    await useCase.execute("mat-1", "org-1", -3);

    expect(movementRepo.findPageByMaterial).toHaveBeenNthCalledWith(
      1,
      "mat-1",
      "org-1",
      { limit: 20, offset: 0 },
    );
    expect(movementRepo.findPageByMaterial).toHaveBeenNthCalledWith(
      2,
      "mat-1",
      "org-1",
      { limit: 20, offset: 0 },
    );
  });

  it("calcula o offset a partir de page/limit", async () => {
    const materialRepo = buildFakeMaterialRepo();
    const movementRepo = buildFakeMovementRepo();
    const useCase = new ListStockMovementsUseCase(materialRepo, movementRepo);

    await useCase.execute("mat-1", "org-1", 3, 10);

    expect(movementRepo.findPageByMaterial).toHaveBeenCalledWith(
      "mat-1",
      "org-1",
      { limit: 10, offset: 20 },
    );
  });

  it("calcula pages corretamente (Math.ceil(total/limit)) e 0 quando total=0", async () => {
    const materialRepo = buildFakeMaterialRepo();
    const movementRepo = buildFakeMovementRepo({
      findPageByMaterial: jest
        .fn()
        .mockResolvedValue({ rows: [buildMovement()], total: 41 }),
    });
    const useCase = new ListStockMovementsUseCase(materialRepo, movementRepo);

    const result = await useCase.execute("mat-1", "org-1", 1, 20);

    expect(result.total).toBe(41);
    expect(result.pages).toBe(3);

    const emptyRepo = buildFakeMovementRepo({
      findPageByMaterial: jest.fn().mockResolvedValue({ rows: [], total: 0 }),
    });
    const emptyUseCase = new ListStockMovementsUseCase(materialRepo, emptyRepo);

    const emptyResult = await emptyUseCase.execute("mat-1", "org-1");

    expect(emptyResult.pages).toBe(0);
  });
});
