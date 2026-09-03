import {
  CreateStockMovementData,
  StockMovementEntity,
} from "./stock-movement.entity";

export const STOCK_MOVEMENT_REPOSITORY = Symbol("STOCK_MOVEMENT_REPOSITORY");

export interface IStockMovementRepository {
  findPageByMaterial(
    materialId: string,
    orgId: string,
    pagination: { limit: number; offset: number },
  ): Promise<{ rows: StockMovementEntity[]; total: number }>;
  create(data: CreateStockMovementData): Promise<StockMovementEntity>;
}

