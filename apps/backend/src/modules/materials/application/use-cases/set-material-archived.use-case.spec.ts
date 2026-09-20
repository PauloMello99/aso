import { SetMaterialArchivedUseCase } from "./set-material-archived.use-case";
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
    setArchived: jest.fn().mockResolvedValue(buildMaterial()),
    syncLowStockMarker: jest.fn().mockResolvedValue(false),
    ...overrides,
  } as unknown as jest.Mocked<IMaterialRepository>;
}

function buildFakeLowStockAlerts(): jest.Mocked<LowStockAlertService> {
  return {
    scheduleIfAny: jest.fn(),
  } as unknown as jest.Mocked<LowStockAlertService>;
}

describe("SetMaterialArchivedUseCase", () => {
  it("lança MaterialNotFoundException quando o material não existe", async () => {
    const repo = buildFakeMaterialRepo({
      findById: jest.fn().mockResolvedValue(null),
    });
    const useCase = new SetMaterialArchivedUseCase(
      repo,
      buildFakeLowStockAlerts(),
    );

    await expect(
      useCase.execute("material-1", "org-1", false),
    ).rejects.toBeInstanceOf(MaterialNotFoundException);
    expect(repo.setArchived).not.toHaveBeenCalled();
  });

  it("arquivar não sincroniza o marcador nem alerta", async () => {
    const repo = buildFakeMaterialRepo();
    const lowStockAlerts = buildFakeLowStockAlerts();
    const useCase = new SetMaterialArchivedUseCase(repo, lowStockAlerts);

    await useCase.execute("material-1", "org-1", true);

    expect(repo.setArchived).toHaveBeenCalledWith("material-1", "org-1", true);
    expect(repo.syncLowStockMarker).not.toHaveBeenCalled();
    expect(lowStockAlerts.scheduleIfAny).not.toHaveBeenCalled();
  });

  it("desarquivar abaixo do mínimo reabre o episódio e alerta", async () => {
    const repo = buildFakeMaterialRepo({
      syncLowStockMarker: jest.fn().mockResolvedValue(true),
    });
    const lowStockAlerts = buildFakeLowStockAlerts();
    const useCase = new SetMaterialArchivedUseCase(repo, lowStockAlerts);

    await useCase.execute("material-1", "org-1", false);

    expect(repo.syncLowStockMarker).toHaveBeenCalledWith("material-1");
    expect(lowStockAlerts.scheduleIfAny).toHaveBeenCalledWith("org-1", [
      expect.objectContaining({ id: "material-1" }),
    ]);
  });

  it("desarquivar sem cruzar o mínimo sincroniza mas não alerta", async () => {
    const repo = buildFakeMaterialRepo();
    const lowStockAlerts = buildFakeLowStockAlerts();
    const useCase = new SetMaterialArchivedUseCase(repo, lowStockAlerts);

    await useCase.execute("material-1", "org-1", false);

    expect(repo.syncLowStockMarker).toHaveBeenCalledTimes(1);
    expect(lowStockAlerts.scheduleIfAny).not.toHaveBeenCalled();
  });
});
