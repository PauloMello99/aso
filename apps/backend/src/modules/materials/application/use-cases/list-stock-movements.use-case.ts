import { Inject, Injectable } from "@nestjs/common";
import { MaterialNotFoundException } from "../../domain/exceptions/material-not-found.exception";
import { StockMovementEntity } from "../../domain/stock-movement.entity";
import {
  IMaterialRepository,
  MATERIAL_REPOSITORY,
} from "../../domain/material.repository.interface";
import {
  IStockMovementRepository,
  ListMovementsFilter,
  STOCK_MOVEMENT_REPOSITORY,
} from "../../domain/stock-movement.repository.interface";

@Injectable()
export class ListStockMovementsUseCase {
  constructor(
    @Inject(MATERIAL_REPOSITORY)
    private readonly materialRepo: IMaterialRepository,
    @Inject(STOCK_MOVEMENT_REPOSITORY)
    private readonly movementRepo: IStockMovementRepository,
  ) {}

  async execute(
    materialId: string,
    orgId: string,
    filter?: ListMovementsFilter,
  ): Promise<StockMovementEntity[]> {
    const material = await this.materialRepo.findById(materialId, orgId);
    if (!material) throw new MaterialNotFoundException(materialId);
    return this.movementRepo.findAllByMaterial(materialId, orgId, filter);
  }
}

