import { Inject, Injectable } from "@nestjs/common";
import { and, count, desc, eq } from "drizzle-orm";
import { DRIZZLE, DrizzleDB } from "../../../../database/database.module";
import * as schema from "../../../../database/schema";
import {
  CreateStockMovementData,
  StockMovementEntity,
} from "../../domain/stock-movement.entity";
import { IStockMovementRepository } from "../../domain/stock-movement.repository.interface";
import { StockMovementMapper } from "./stock-movement.mapper";

@Injectable()
export class DrizzleStockMovementRepository
  implements IStockMovementRepository
{
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async findPageByMaterial(
    materialId: string,
    orgId: string,
    pagination: { limit: number; offset: number },
  ): Promise<{ rows: StockMovementEntity[]; total: number }> {
    const where = and(
      eq(schema.stockMovements.materialId, materialId),
      eq(schema.stockMovements.orgId, orgId),
    );

    const [rows, countRows] = await Promise.all([
      this.db
        .select()
        .from(schema.stockMovements)
        .where(where)
        .orderBy(
          desc(schema.stockMovements.createdAt),
          desc(schema.stockMovements.id),
        )
        .limit(pagination.limit)
        .offset(pagination.offset),
      this.db
        .select({ total: count() })
        .from(schema.stockMovements)
        .where(where),
    ]);

    return {
      rows: rows.map(StockMovementMapper.toDomain),
      total: Number(countRows[0]?.total ?? 0),
    };
  }

  async create(data: CreateStockMovementData): Promise<StockMovementEntity> {
    const [row] = await this.db
      .insert(schema.stockMovements)
      .values({
        orgId: data.orgId,
        materialId: data.materialId,
        type: data.type,
        quantityDelta: data.quantityDelta,
        serviceId: data.serviceId ?? null,
        note: data.note ?? null,
        createdBy: data.createdBy ?? null,
      })
      .returning();
    return StockMovementMapper.toDomain(row!);
  }
}

