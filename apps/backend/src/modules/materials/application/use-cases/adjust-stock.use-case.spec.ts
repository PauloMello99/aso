import { AdjustStockUseCase } from "./adjust-stock.use-case";
import { MaterialEntity } from "../../domain/material.entity";
import { IMaterialRepository } from "../../domain/material.repository.interface";
import { IStockMovementRepository } from "../../domain/stock-movement.repository.interface";
import { MaterialNotFoundException } from "../../domain/exceptions/material-not-found.exception";
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
    stockQuantity: "1",
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
    touchLastUsed: jest.fn(),
    ...overrides,
  } as unknown as jest.Mocked<IMaterialRepository>;
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

const baseInput = {
  orgId: "org-1",
  materialId: "material-1",
  quantityDelta: "-2",
};

describe("AdjustStockUseCase", () => {
  it("lança MaterialNotFoundException quando o material não existe", async () => {
    const lowStockAlerts = buildFakeLowStockAlerts();
    const useCase = new AdjustStockUseCase(
      buildFakeMaterialRepo({ findById: jest.fn().mockResolvedValue(null) }),
      buildFakeMovementRepo(),
      lowStockAlerts,
    );

    await expect(useCase.execute(baseInput)).rejects.toBeInstanceOf(
      MaterialNotFoundException,
    );
    expect(lowStockAlerts.scheduleIfAny).not.toHaveBeenCalled();
  });

  it("agenda alerta com o item quando a escrita cruzou o mínimo", async () => {
    const updated = buildMaterial({ stockQuantity: "1" });
    const lowStockAlerts = buildFakeLowStockAlerts();
    const useCase = new AdjustStockUseCase(
      buildFakeMaterialRepo({
        updateStockQuantity: jest
          .fn()
          .mockResolvedValue({ material: updated, crossedLowStock: true }),
      }),
      buildFakeMovementRepo(),
      lowStockAlerts,
    );

    const result = await useCase.execute(baseInput);

    expect(result).toBe(updated);
    expect(lowStockAlerts.scheduleIfAny).toHaveBeenCalledTimes(1);
    expect(lowStockAlerts.scheduleIfAny).toHaveBeenCalledWith("org-1", [
      {
        id: "material-1",
        name: "Tinta",
        stockQuantity: "1",
        minimumQuantity: "5",
      },
    ]);
  });

  it("agenda com lista vazia quando não cruzou o mínimo", async () => {
    const lowStockAlerts = buildFakeLowStockAlerts();
    const useCase = new AdjustStockUseCase(
      buildFakeMaterialRepo(),
      buildFakeMovementRepo(),
      lowStockAlerts,
    );

    await useCase.execute(baseInput);

    expect(lowStockAlerts.scheduleIfAny).toHaveBeenCalledWith("org-1", []);
  });
});
