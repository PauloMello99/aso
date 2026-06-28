import { Inject, Injectable } from "@nestjs/common";
import {
  IMaterialRepository,
  MATERIAL_REPOSITORY,
} from "../../domain/material.repository.interface";
import {
  IStockMovementRepository,
  STOCK_MOVEMENT_REPOSITORY,
} from "../../domain/stock-movement.repository.interface";
import {
  IStockVerificationRepository,
  STOCK_VERIFICATION_REPOSITORY,
  VerificationItemInput,
} from "../../domain/stock-verification.repository.interface";

export interface CreateStockVerificationInput {
  orgId: string;
  performedBy?: string | null;
  note?: string | null;
  /** Se true, gera ajustes de estoque para reconciliar discrepâncias. */
  reconcile?: boolean;
  items: { materialId: string; physicalQuantity: string }[];
}

export interface VerificationResultItem {
  materialId: string;
  systemQuantity: string;
  physicalQuantity: string;
  discrepancy: string;
}

@Injectable()
export class CreateStockVerificationUseCase {
  constructor(
    @Inject(STOCK_VERIFICATION_REPOSITORY)
    private readonly repo: IStockVerificationRepository,
    @Inject(MATERIAL_REPOSITORY)
    private readonly materialRepo: IMaterialRepository,
    @Inject(STOCK_MOVEMENT_REPOSITORY)
    private readonly movementRepo: IStockMovementRepository,
  ) {}

  async execute(
    input: CreateStockVerificationInput,
  ): Promise<{ id: string; items: VerificationResultItem[] }> {
    const resolved: VerificationItemInput[] = [];
    const results: VerificationResultItem[] = [];

    for (const item of input.items) {
      const material = await this.materialRepo.findById(
        item.materialId,
        input.orgId,
      );
      if (!material) continue;

      const system = material.stockQuantity;
      const physical = item.physicalQuantity;
      const discrepancy = (
        Number.parseFloat(physical) - Number.parseFloat(system)
      ).toFixed(2);

      resolved.push({
        materialId: item.materialId,
        systemQuantity: system,
        physicalQuantity: physical,
      });
      results.push({
        materialId: item.materialId,
        systemQuantity: system,
        physicalQuantity: physical,
        discrepancy,
      });

      // Reconciliar: ajuste de estoque para casar o físico.
      if (input.reconcile && Number.parseFloat(discrepancy) !== 0) {
        await this.movementRepo.create({
          orgId: input.orgId,
          materialId: item.materialId,
          type: "manual_adjustment",
          quantityDelta: discrepancy,
          note: "Reconciliação de conferência de estoque",
          createdBy: input.performedBy ?? null,
        });
        await this.materialRepo.updateStockQuantity(item.materialId, discrepancy);
      }
    }

    const id = await this.repo.create({
      orgId: input.orgId,
      performedBy: input.performedBy ?? null,
      note: input.note ?? null,
      items: resolved,
    });

    return { id, items: results };
  }
}
