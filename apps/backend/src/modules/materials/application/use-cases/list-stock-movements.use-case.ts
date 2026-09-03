import { Inject, Injectable } from "@nestjs/common";
import {
  buildPaginated,
  Paginated,
  resolvePageRequest,
} from "../../../../common/pagination/pagination";
import { MaterialNotFoundException } from "../../domain/exceptions/material-not-found.exception";
import { StockMovementEntity } from "../../domain/stock-movement.entity";
import {
  IMaterialRepository,
  MATERIAL_REPOSITORY,
} from "../../domain/material.repository.interface";
import {
  IStockMovementRepository,
  STOCK_MOVEMENT_REPOSITORY,
} from "../../domain/stock-movement.repository.interface";

const PAGINATION_BOUNDS = { defaultLimit: 20, maxLimit: 100 };

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
    page?: number,
    limit?: number,
  ): Promise<Paginated<StockMovementEntity>> {
    const material = await this.materialRepo.findById(materialId, orgId);
    if (!material) throw new MaterialNotFoundException(materialId);

    const {
      page: resolvedPage,
      limit: resolvedLimit,
      offset,
    } = resolvePageRequest({ page, limit }, PAGINATION_BOUNDS);

    const { rows, total } = await this.movementRepo.findPageByMaterial(
      materialId,
      orgId,
      { limit: resolvedLimit, offset },
    );

    return buildPaginated(rows, total, resolvedPage, resolvedLimit);
  }
}

