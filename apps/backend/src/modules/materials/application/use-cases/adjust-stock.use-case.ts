import { Inject, Injectable } from "@nestjs/common";
import { MaterialNotFoundException } from "../../domain/exceptions/material-not-found.exception";
import { MaterialEntity } from "../../domain/material.entity";
import {
  IMaterialRepository,
  MATERIAL_REPOSITORY,
} from "../../domain/material.repository.interface";
import {
  IStockMovementRepository,
  STOCK_MOVEMENT_REPOSITORY,
} from "../../domain/stock-movement.repository.interface";

export interface AdjustStockInput {
  orgId: string;
  materialId: string;
  quantityDelta: string;
  note?: string | null;
  createdBy?: string | null;
}

@Injectable()
export class AdjustStockUseCase {
  constructor(
    @Inject(MATERIAL_REPOSITORY)
    private readonly materialRepo: IMaterialRepository,
    @Inject(STOCK_MOVEMENT_REPOSITORY)
    private readonly movementRepo: IStockMovementRepository,
  ) {}

  async execute(input: AdjustStockInput): Promise<MaterialEntity> {
    const material = await this.materialRepo.findById(
      input.materialId,
      input.orgId,
    );
    if (!material) throw new MaterialNotFoundException(input.materialId);

    await this.movementRepo.create({
      orgId: input.orgId,
      materialId: input.materialId,
      type: "manual_adjustment",
      quantityDelta: input.quantityDelta,
      note: input.note ?? null,
      createdBy: input.createdBy ?? null,
    });

    if (input.quantityDelta.trim().startsWith("-")) {
      await this.materialRepo.touchLastUsed(input.materialId);
    }

    return this.materialRepo.updateStockQuantity(
      input.materialId,
      input.quantityDelta,
    );
  }
}

