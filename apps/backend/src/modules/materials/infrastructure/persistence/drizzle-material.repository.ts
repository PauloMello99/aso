import { Inject, Injectable } from "@nestjs/common";
import { and, asc, eq, ilike, isNotNull, isNull, lte, sql } from "drizzle-orm";
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

    // Por padrão lista só ativos; archived=true → só arquivados.
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
      // stock_quantity <= minimum_quantity AND minimum_quantity > 0
      conditions.push(
        lte(schema.materials.stockQuantity, schema.materials.minimumQuantity),
        lte(sql`'0'::numeric`, schema.materials.minimumQuantity),
      );
    }

    const orderBy =
      filter?.sortBy === "name"
        ? [asc(schema.materials.name)]
        : // Padrão: último usado primeiro (nulls por último), depois nome.
          [
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
  ): Promise<MaterialEntity> {
    const [row] = await this.db
      .update(schema.materials)
      .set({
        stockQuantity: sql`${schema.materials.stockQuantity} + ${delta}::numeric`,
        updatedAt: new Date(),
      })
      .where(eq(schema.materials.id, id))
      .returning();
    return MaterialMapper.toDomain(row!);
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
      .set({ archivedAt: archived ? new Date() : null, updatedAt: new Date() })
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

