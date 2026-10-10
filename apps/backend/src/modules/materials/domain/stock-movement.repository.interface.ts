import {
  CreateStockMovementData,
  StockMovementEntity,
} from "./stock-movement.entity";

export const STOCK_MOVEMENT_REPOSITORY = Symbol("STOCK_MOVEMENT_REPOSITORY");

export interface MaterialConsumptionRow {
  materialId: string;
  name: string;
  quantity: number;
  /** Custo estimado (consumo * cost_per_unit) em centavos inteiros; null se o material nao tem custo. */
  costCents: number | null;
}

export interface IStockMovementRepository {
  /**
   * Materiais mais consumidos por servicos realizados no periodo
   * (`services.performed_at`), ordenados por quantidade desc. Considera so
   * movimentos `service_consumption` de servicos nao cancelados; inclui
   * materiais arquivados.
   */
  topConsumedByPeriod(
    orgId: string,
    from: Date,
    to: Date,
    limit: number,
  ): Promise<MaterialConsumptionRow[]>;
  findPageByMaterial(
    materialId: string,
    orgId: string,
    pagination: { limit: number; offset: number },
  ): Promise<{ rows: StockMovementEntity[]; total: number }>;
  create(data: CreateStockMovementData): Promise<StockMovementEntity>;
}

