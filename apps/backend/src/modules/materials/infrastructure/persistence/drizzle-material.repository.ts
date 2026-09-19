import { Inject, Injectable } from "@nestjs/common";
import {
  and,
  asc,
  eq,
  gte,
  ilike,
  isNotNull,
  isNull,
  lte,
  sql,
  type SQL,
} from "drizzle-orm";
import { DRIZZLE, DrizzleDB } from "../../../../database/database.module";
import * as schema from "../../../../database/schema";
import {
  CreateMaterialData,
  MaterialEntity,
  UpdateMaterialData,
} from "../../domain/material.entity";
import {
  IMaterialRepository,
  ListMaterialsFilter,
  StockUpdateResult,
} from "../../domain/material.repository.interface";
import { MaterialMapper } from "./material.mapper";

@Injectable()
export class DrizzleMaterialRepository implements IMaterialRepository {
  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async findById(id: string, orgId: string): Promise<MaterialEntity | null> {
    const [row] = await this.db
      .select()
      .from(schema.materials)
      .where(
        and(eq(schema.materials.id, id), eq(schema.materials.orgId, orgId)),
      )
      .limit(1);
    return row ? MaterialMapper.toDomain(row) : null;
  }

  async findAllByOrg(
    orgId: string,
    filter?: ListMaterialsFilter,
  ): Promise<MaterialEntity[]> {
    const conditions = [eq(schema.materials.orgId, orgId)];

    conditions.push(
      filter?.archived
        ? isNotNull(schema.materials.archivedAt)
        : isNull(schema.materials.archivedAt),
    );

    if (filter?.categoryId) {
      conditions.push(eq(schema.materials.categoryId, filter.categoryId));
    }

    if (filter?.name) {
      conditions.push(ilike(schema.materials.name, `%${filter.name}%`));
    }

    if (filter?.lowStockOnly) {
      conditions.push(
        lte(schema.materials.stockQuantity, schema.materials.minimumQuantity),
        lte(sql`'0'::numeric`, schema.materials.minimumQuantity),
      );
    }

    if (filter?.shareable !== undefined) {
      conditions.push(eq(schema.materials.shareable, filter.shareable));
    }

    if (filter?.minCost !== undefined) {
      conditions.push(
        gte(schema.materials.costPerUnit, sql`${filter.minCost}::numeric`),
      );
    }
    if (filter?.maxCost !== undefined) {
      conditions.push(
        lte(schema.materials.costPerUnit, sql`${filter.maxCost}::numeric`),
      );
    }

    const orderBy =
      filter?.sortBy === "name"
        ? [asc(schema.materials.name)]
        : [
            sql`${schema.materials.lastUsedAt} DESC NULLS LAST`,
            asc(schema.materials.name),
          ];

    const rows = await this.db
      .select()
      .from(schema.materials)
      .where(and(...conditions))
      .orderBy(...orderBy);

    return rows.map(MaterialMapper.toDomain);
  }

  async create(data: CreateMaterialData): Promise<MaterialEntity> {
    const [row] = await this.db
      .insert(schema.materials)
      .values({
        orgId: data.orgId,
        categoryId: data.categoryId ?? null,
        name: data.name,
        minimumQuantity: data.minimumQuantity ?? "0",
        costPerUnit: data.costPerUnit ?? null,
        shareable: data.shareable ?? false,
      })
      .returning();
    return MaterialMapper.toDomain(row!);
  }

  async update(id: string, data: UpdateMaterialData): Promise<MaterialEntity> {
    const [row] = await this.db
      .update(schema.materials)
      .set({
        ...(data.categoryId !== undefined && { categoryId: data.categoryId }),
        ...(data.name !== undefined && { name: data.name }),
        ...(data.minimumQuantity !== undefined && {
          minimumQuantity: data.minimumQuantity,
        }),
        ...(data.costPerUnit !== undefined && { costPerUnit: data.costPerUnit }),
        ...(data.shareable !== undefined && { shareable: data.shareable }),
        updatedAt: new Date(),
      })
      .where(eq(schema.materials.id, id))
      .returning();
    return MaterialMapper.toDomain(row!);
  }

  async updateStockQuantity(
    id: string,
    delta: string,
  ): Promise<StockUpdateResult> {
    const prev = await this.lockAlertMarker(id);
    const nextStock = sql`(${schema.materials.stockQuantity} + ${delta}::numeric)`;
    const [row] = await this.db
      .update(schema.materials)
      .set({
        stockQuantity: sql`${schema.materials.stockQuantity} + ${delta}::numeric`,
        lowStockAlertedAt: this.lowStockMarkerExpr(nextStock),
        updatedAt: new Date(),
      })
      .where(eq(schema.materials.id, id))
      .returning();
    return {
      material: MaterialMapper.toDomain(row!),
      crossedLowStock: prev === null && row!.lowStockAlertedAt !== null,
    };
  }

  async syncLowStockMarker(id: string): Promise<boolean> {
    const prev = await this.lockAlertMarker(id);
    const [row] = await this.db
      .update(schema.materials)
      .set({
        lowStockAlertedAt: this.lowStockMarkerExpr(
          sql`${schema.materials.stockQuantity}`,
        ),
        updatedAt: new Date(),
      })
      .where(eq(schema.materials.id, id))
      .returning({ lowStockAlertedAt: schema.materials.lowStockAlertedAt });
    return prev === null && !!row && row.lowStockAlertedAt !== null;
  }

  // Serializa escritas concorrentes no mesmo material para que exatamente uma
  // observe a transicao NULL -> preenchido. Retorna o marcador anterior.
  // Exige transacao de request ativa (RlsContext.runWithClaims): fora dela
  // (cron/bootstrap) o FOR UPDATE nao segura o lock e a garantia de
  // exatamente-uma-vez degrada. NAO chamar de cron.
  private async lockAlertMarker(id: string): Promise<Date | null> {
    const [locked] = await this.db
      .select({ lowStockAlertedAt: schema.materials.lowStockAlertedAt })
      .from(schema.materials)
      .where(eq(schema.materials.id, id))
      .for("update");
    return locked?.lowStockAlertedAt ?? null;
  }

  // Mesma semantica de MaterialEntity.isLowStock (minimo > 0 e estoque <=
  // minimo), mais o guard de arquivado. Mantem o marcador ja aberto; limpa
  // quando a condicao deixa de valer.
  private lowStockMarkerExpr(nextStock: SQL) {
    return sql`CASE WHEN ${schema.materials.archivedAt} IS NULL AND ${schema.materials.minimumQuantity} > 0 AND ${nextStock} <= ${schema.materials.minimumQuantity} THEN COALESCE(${schema.materials.lowStockAlertedAt}, now()) ELSE NULL END`;
  }

  async touchLastUsed(id: string): Promise<void> {
    await this.db
      .update(schema.materials)
      .set({ lastUsedAt: new Date() })
      .where(eq(schema.materials.id, id));
  }

  async setArchived(
    id: string,
    orgId: string,
    archived: boolean,
  ): Promise<MaterialEntity> {
    const [row] = await this.db
      .update(schema.materials)
      .set({
        archivedAt: archived ? new Date() : null,
        ...(archived && { lowStockAlertedAt: null }),
        updatedAt: new Date(),
      })
      .where(
        and(eq(schema.materials.id, id), eq(schema.materials.orgId, orgId)),
      )
      .returning();
    return MaterialMapper.toDomain(row!);
  }

  async isLinkedToService(id: string): Promise<boolean> {
    const [row] = await this.db
      .select({ id: schema.serviceMaterials.id })
      .from(schema.serviceMaterials)
      .where(eq(schema.serviceMaterials.materialId, id))
      .limit(1);
    return !!row;
  }

  async delete(id: string, orgId: string): Promise<void> {
    await this.db
      .delete(schema.materials)
      .where(
        and(eq(schema.materials.id, id), eq(schema.materials.orgId, orgId)),
      );
  }
}

