import { Inject, Injectable } from "@nestjs/common";
import {
  and,
  asc,
  count,
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

  private buildListConditions(
    orgId: string,
    filter?: ListMaterialsFilter,
  ): SQL[] {
    const conditions: SQL[] = [eq(schema.materials.orgId, orgId)];

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

    return conditions;
  }

  private listOrderBy(filter?: ListMaterialsFilter): SQL[] {
    return filter?.sortBy === "name"
      ? [asc(schema.materials.name), asc(schema.materials.id)]
      : [
          sql`${schema.materials.lastUsedAt} DESC NULLS LAST`,
          asc(schema.materials.name),
          asc(schema.materials.id),
        ];
  }

  async findAllByOrg(
    orgId: string,
    filter?: ListMaterialsFilter,
  ): Promise<MaterialEntity[]> {
    const rows = await this.db
      .select()
      .from(schema.materials)
      .where(and(...this.buildListConditions(orgId, filter)))
      .orderBy(...this.listOrderBy(filter));

    return rows.map(MaterialMapper.toDomain);
  }

  async findPageByOrg(
    orgId: string,
    filter: ListMaterialsFilter | undefined,
    pagination: { limit: number; offset: number },
  ): Promise<{ rows: MaterialEntity[]; total: number }> {
    const conditions = this.buildListConditions(orgId, filter);

    const [rows, countRows] = await Promise.all([
      this.db
        .select()
        .from(schema.materials)
        .where(and(...conditions))
        .orderBy(...this.listOrderBy(filter))
        .limit(pagination.limit)
        .offset(pagination.offset),
      this.db
        .select({ total: count() })
        .from(schema.materials)
        .where(and(...conditions)),
    ]);

    return {
      rows: rows.map(MaterialMapper.toDomain),
      total: Number(countRows[0]?.total ?? 0),
    };
  }

  async findOptionsByOrg(
    orgId: string,
    params: { limit: number },
  ): Promise<MaterialEntity[]> {
    const rows = await this.db
      .select()
      .from(schema.materials)
      .where(
        and(
          eq(schema.materials.orgId, orgId),
          isNull(schema.materials.archivedAt),
        ),
      )
      .orderBy(asc(schema.materials.name), asc(schema.materials.id))
      .limit(params.limit + 1);

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

