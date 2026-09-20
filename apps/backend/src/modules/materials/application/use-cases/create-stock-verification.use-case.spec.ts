import { CreateStockVerificationUseCase } from "./create-stock-verification.use-case";
import { MaterialEntity } from "../../domain/material.entity";
import { IMaterialRepository } from "../../domain/material.repository.interface";
import { IStockMovementRepository } from "../../domain/stock-movement.repository.interface";
import { IStockVerificationRepository } from "../../domain/stock-verification.repository.interface";
import { LowStockAlertService } from "../low-stock-alert.service";

jest.mock("../../../../database/database.module", () => ({
  registerPostCommit: jest.fn(),
}));

function buildMaterial(
  overrides: Partial<Parameters<typeof MaterialEntity.create>[0]> = {},
): MaterialEntity {
  return MaterialEntity.create({
    id: "material-1",
    orgId: "org-1",
    categoryId: null,
    name: "Tinta",
    stockQuantity: "10",
    minimumQuantity: "5",
    costPerUnit: null,
    shareable: false,
    lastUsedAt: null,
    archivedAt: null,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  });
}

function buildFakeMaterialRepo(
  overrides: Partial<jest.Mocked<IMaterialRepository>> = {},
): jest.Mocked<IMaterialRepository> {
  return {
    findById: jest.fn().mockResolvedValue(buildMaterial()),
    updateStockQuantity: jest
      .fn()
      .mockResolvedValue({ material: buildMaterial(), crossedLowStock: false }),
    ...overrides,
  } as unknown as jest.Mocked<IMaterialRepository>;
}

function buildFakeVerificationRepo(): jest.Mocked<IStockVerificationRepository> {
  return {
    create: jest.fn().mockResolvedValue("verification-1"),
  } as unknown as jest.Mocked<IStockVerificationRepository>;
}

function buildFakeMovementRepo(): jest.Mocked<IStockMovementRepository> {
  return {
    create: jest.fn(),
  } as unknown as jest.Mocked<IStockMovementRepository>;
}

function buildFakeLowStockAlerts(): jest.Mocked<LowStockAlertService> {
  return {
    scheduleIfAny: jest.fn(),
  } as unknown as jest.Mocked<LowStockAlertService>;
}

describe("CreateStockVerificationUseCase", () => {
  it("com reconcile, acumula os cruzamentos do loop e agenda UM alerta após o loop", async () => {
    const lowStockAlerts = buildFakeLowStockAlerts();
    const useCase = new CreateStockVerificationUseCase(
      buildFakeVerificationRepo(),
      buildFakeMaterialRepo({
        findById: jest
          .fn()
          .mockImplementation((id: string) =>
            Promise.resolve(buildMaterial({ id, stockQuantity: "10" })),
          ),
        updateStockQuantity: jest
          .fn()
          .mockImplementation((id: string) =>
            Promise.resolve({
              material: buildMaterial({ id, stockQuantity: "2" }),
              crossedLowStock: id !== "m3",
            }),
          ),
      }),
      buildFakeMovementRepo(),
      lowStockAlerts,
    );

    await useCase.execute({
      orgId: "org-1",
      reconcile: true,
      items: [
        { materialId: "m1", physicalQuantity: "2" },
        { materialId: "m2", physicalQuantity: "2" },
        { materialId: "m3", physicalQuantity: "2" },
      ],
    });

    expect(lowStockAlerts.scheduleIfAny).toHaveBeenCalledTimes(1);
    expect(lowStockAlerts.scheduleIfAny).toHaveBeenCalledWith("org-1", [
      expect.objectContaining({ id: "m1" }),
      expect.objectContaining({ id: "m2" }),
    ]);
  });

  it("sem reconcile não escreve estoque e agenda com lista vazia", async () => {
    const lowStockAlerts = buildFakeLowStockAlerts();
    const materialRepo = buildFakeMaterialRepo();
    const useCase = new CreateStockVerificationUseCase(
      buildFakeVerificationRepo(),
      materialRepo,
      buildFakeMovementRepo(),
      lowStockAlerts,
    );

    await useCase.execute({
      orgId: "org-1",
      items: [{ materialId: "material-1", physicalQuantity: "2" }],
    });

    expect(materialRepo.updateStockQuantity).not.toHaveBeenCalled();
    expect(lowStockAlerts.scheduleIfAny).toHaveBeenCalledWith("org-1", []);
  });
});
