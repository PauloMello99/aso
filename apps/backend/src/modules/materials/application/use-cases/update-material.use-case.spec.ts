import { UpdateMaterialUseCase } from "./update-material.use-case";
import { MaterialEntity } from "../../domain/material.entity";
import { IMaterialRepository } from "../../domain/material.repository.interface";
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
    stockQuantity: "3",
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
    update: jest.fn().mockResolvedValue(buildMaterial()),
    syncLowStockMarker: jest.fn().mockResolvedValue(false),
    ...overrides,
  } as unknown as jest.Mocked<IMaterialRepository>;
}

function buildFakeLowStockAlerts(): jest.Mocked<LowStockAlertService> {
  return {
    scheduleIfAny: jest.fn(),
  } as unknown as jest.Mocked<LowStockAlertService>;
}

describe("UpdateMaterialUseCase", () => {
  it("lança MaterialNotFoundException quando o material não existe", async () => {
    const repo = buildFakeMaterialRepo({
      findById: jest.fn().mockResolvedValue(null),
    });
    const useCase = new UpdateMaterialUseCase(repo, buildFakeLowStockAlerts());

    await expect(
      useCase.execute("material-1", "org-1", { name: "Novo" }),
    ).rejects.toBeInstanceOf(MaterialNotFoundException);
    expect(repo.update).not.toHaveBeenCalled();
  });

  it("editar só o nome não sincroniza o marcador nem alerta", async () => {
    const repo = buildFakeMaterialRepo();
    const lowStockAlerts = buildFakeLowStockAlerts();
    const useCase = new UpdateMaterialUseCase(repo, lowStockAlerts);

    await useCase.execute("material-1", "org-1", { name: "Novo" });

    expect(repo.syncLowStockMarker).not.toHaveBeenCalled();
    expect(lowStockAlerts.scheduleIfAny).not.toHaveBeenCalled();
  });

  it("alterar o mínimo sincroniza o marcador e alerta quando abriu episódio", async () => {
    const updated = buildMaterial({ minimumQuantity: "10" });
    const repo = buildFakeMaterialRepo({
      update: jest.fn().mockResolvedValue(updated),
      syncLowStockMarker: jest.fn().mockResolvedValue(true),
    });
    const lowStockAlerts = buildFakeLowStockAlerts();
    const useCase = new UpdateMaterialUseCase(repo, lowStockAlerts);

    const result = await useCase.execute("material-1", "org-1", {
      minimumQuantity: "10",
    });

    expect(result).toBe(updated);
    expect(repo.syncLowStockMarker).toHaveBeenCalledWith("material-1");
    expect(lowStockAlerts.scheduleIfAny).toHaveBeenCalledTimes(1);
    expect(lowStockAlerts.scheduleIfAny).toHaveBeenCalledWith("org-1", [
      expect.objectContaining({ id: "material-1", minimumQuantity: "10" }),
    ]);
  });

  it("alterar o mínimo sem abrir episódio sincroniza mas não alerta", async () => {
    const repo = buildFakeMaterialRepo();
    const lowStockAlerts = buildFakeLowStockAlerts();
    const useCase = new UpdateMaterialUseCase(repo, lowStockAlerts);

    await useCase.execute("material-1", "org-1", { minimumQuantity: "1" });

    expect(repo.syncLowStockMarker).toHaveBeenCalledTimes(1);
    expect(lowStockAlerts.scheduleIfAny).not.toHaveBeenCalled();
  });
});
