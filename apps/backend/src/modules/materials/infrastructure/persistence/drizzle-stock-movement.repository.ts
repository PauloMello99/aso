import { Inject, Injectable } from "@nestjs/common";
import { and, desc, eq } from "drizzle-orm";
import { DRIZZLE, DrizzleDB } from "../../../../database/database.module";
import * as schema from "../../../../database/schema";
import {
  CreateStockMovementData,
  StockMovementEntity,
} from "../../domain/stock-movement.entity";
import {
  IStockMovementRepository,
  ListMovementsFilter,
} from "../../domain/stock-movement.repository.interface";
import { StockMovementMapper } from "./stock-movement.mapper";

@Injectable()
export class DrizzleStockMovementRepository
  implements IStockMovementRepository
{
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async findAllByMaterial(
    materialId: string,
    orgId: string,
    filter?: ListMovementsFilter,
  ): Promise<StockMovementEntity[]> {
    const rows = await this.db
      .select()
      .from(schema.stockMovements)
      .where(
        and(
          eq(schema.stockMovements.materialId, materialId),
          eq(schema.stockMovements.orgId, orgId),
        ),
      )
      .orderBy(desc(schema.stockMovements.createdAt))
      .limit(filter?.limit ?? 50)
      .offset(filter?.offset ?? 0);

    return rows.map(StockMovementMapper.toDomain);
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

