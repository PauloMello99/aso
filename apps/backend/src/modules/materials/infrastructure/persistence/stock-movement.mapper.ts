import type { StockMovement as StockMovementRow } from "../../../../database/schema/studio/stock-movements";
import { StockMovementEntity } from "../../domain/stock-movement.entity";

export class StockMovementMapper {
  static toDomain(row: StockMovementRow): StockMovementEntity {
    return StockMovementEntity.create({
      id: row.id,
      orgId: row.orgId,
      materialId: row.materialId,
      type: row.type,
      quantityDelta: row.quantityDelta,
      serviceId: row.serviceId ?? null,
      note: row.note ?? null,
      createdBy: row.createdBy ?? null,
      createdAt: row.createdAt,
    });
  }
}

