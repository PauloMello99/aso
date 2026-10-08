import { Inject, Injectable } from "@nestjs/common";
import { and, count, desc, eq, sql } from "drizzle-orm";
import { DRIZZLE, DrizzleDB } from "../../../../database/database.module";
import * as schema from "../../../../database/schema";
import {
  CreateStockMovementData,
  StockMovementEntity,
} from "../../domain/stock-movement.entity";
import {
  IStockMovementRepository,
  MaterialConsumptionRow,
} from "../../domain/stock-movement.repository.interface";
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

  async topConsumedByPeriod(
    orgId: string,
    from: Date,
    to: Date,
    limit: number,
  ): Promise<MaterialConsumptionRow[]> {
    const { rows } = await this.db.execute<{
      material_id: string;
      name: string;
      quantity: string;
      cost_cents: string | null;
    }>(sql`
      SELECT sm.material_id,
        m.name,
        SUM(-sm.quantity_delta) AS quantity,
        CASE WHEN m.cost_per_unit IS NULL THEN NULL
          ELSE ROUND(SUM(-sm.quantity_delta) * m.cost_per_unit * 100)::bigint
        END AS cost_cents
      FROM stock_movements sm
      JOIN services s ON s.id = sm.service_id
      JOIN materials m ON m.id = sm.material_id
      WHERE sm.org_id = ${orgId}
        AND sm.type = 'service_consumption'
        AND s.canceled_at IS NULL
        AND s.performed_at >= ${from}
        AND s.performed_at <= ${to}
      GROUP BY sm.material_id, m.name, m.cost_per_unit
      HAVING SUM(-sm.quantity_delta) > 0
      ORDER BY quantity DESC, m.name ASC
      LIMIT ${limit}
    `);
    return rows.map((r) => ({
      materialId: r.material_id,
      name: r.name,
      quantity: Number(r.quantity),
      costCents: r.cost_cents === null ? null : Number(r.cost_cents),
    }));
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

