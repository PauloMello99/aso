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

export interface RestockMaterialInput {
  orgId: string;
  materialId: string;
  quantity: string;
  note?: string | null;
  createdBy?: string | null;
}

@Injectable()
export class RestockMaterialUseCase {
  constructor(
    @Inject(MATERIAL_REPOSITORY)
    private readonly materialRepo: IMaterialRepository,
    @Inject(STOCK_MOVEMENT_REPOSITORY)
    private readonly movementRepo: IStockMovementRepository,
  ) {}

  async execute(input: RestockMaterialInput): Promise<MaterialEntity> {
    const material = await this.materialRepo.findById(
      input.materialId,
      input.orgId,
    );
    if (!material) throw new MaterialNotFoundException(input.materialId);

    await this.movementRepo.create({
      orgId: input.orgId,
      materialId: input.materialId,
      type: "restock",
      quantityDelta: input.quantity,
      note: input.note ?? null,
      createdBy: input.createdBy ?? null,
    });

    return this.materialRepo.updateStockQuantity(
      input.materialId,
      input.quantity,
    );
  }
}

