import { Inject, Injectable } from "@nestjs/common";
import { and, eq, lte, sql } from "drizzle-orm";
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

    if (filter?.categoryId) {
      conditions.push(eq(schema.materials.categoryId, filter.categoryId));
    }

    if (filter?.lowStockOnly) {
      // stock_quantity <= minimum_quantity AND minimum_quantity > 0
      conditions.push(
        lte(schema.materials.stockQuantity, schema.materials.minimumQuantity),
        lte(sql`'0'::numeric`, schema.materials.minimumQuantity),
      );
    }

    const rows = await this.db
      .select()
      .from(schema.materials)
      .where(and(...conditions))
      .orderBy(schema.materials.name);

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
        unit: data.unit ?? null,
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
        ...(data.unit !== undefined && { unit: data.unit }),
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

  async delete(id: string, orgId: string): Promise<void> {
    await this.db
      .delete(schema.materials)
      .where(
        and(eq(schema.materials.id, id), eq(schema.materials.orgId, orgId)),
      );
  }
}

