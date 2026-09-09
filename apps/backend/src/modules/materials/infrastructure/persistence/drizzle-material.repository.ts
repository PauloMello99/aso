import { Inject, Injectable } from "@nestjs/common";
import {
  and,
  asc,
  count,
  eq,
  gte,
  ilike,
  inArray,
  isNotNull,
  isNull,
  lte,
  sql,
  type SQL,
} from "drizzle-orm";
import { DRIZZLE, DrizzleDB } from "../../../../database/database.module";
import * as schema from "../../../../database/schema";
import { containsPattern } from "../../../../common/db/like-pattern.util";
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
      conditions.push(ilike(schema.materials.name, containsPattern(filter.name)));
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
    params: { limit: number; search?: string; serviceTypeId?: string },
  ): Promise<MaterialEntity[]> {
    const conditions: SQL[] = [
      eq(schema.materials.orgId, orgId),
      isNull(schema.materials.archivedAt),
    ];
    if (params.search) {
      conditions.push(
        ilike(schema.materials.name, containsPattern(params.search)),
      );
    }

    if (params.serviceTypeId) {
      const mst = schema.materialServiceTypes;
      const rows = await this.db
        .select({
          id: schema.materials.id,
          orgId: schema.materials.orgId,
          categoryId: schema.materials.categoryId,
          name: schema.materials.name,
          stockQuantity: schema.materials.stockQuantity,
          minimumQuantity: schema.materials.minimumQuantity,
          costPerUnit: schema.materials.costPerUnit,
          shareable: schema.materials.shareable,
          lastUsedAt: schema.materials.lastUsedAt,
          archivedAt: schema.materials.archivedAt,
          createdAt: schema.materials.createdAt,
          updatedAt: schema.materials.updatedAt,
        })
        .from(schema.materials)
        // LEFT JOIN só ordena (vinculados primeiro) — NUNCA filtra, senão a
        // lista deixaria de trazer materiais sem vínculo com este serviceType.
        .leftJoin(
          mst,
          and(
            eq(mst.materialId, schema.materials.id),
            eq(mst.serviceTypeId, params.serviceTypeId),
          ),
        )
        .where(and(...conditions))
        .orderBy(
          sql`(${mst.materialId} IS NOT NULL) DESC`,
          sql`${schema.materials.lastUsedAt} DESC NULLS LAST`,
          asc(schema.materials.name),
          asc(schema.materials.id),
        )
        .limit(params.limit + 1);

      return rows.map(MaterialMapper.toDomain);
    }

    // Sem serviceTypeId, mantém a ordenação alfabética histórica (contrato
    // usado por telas como a conferência física de estoque); ordenar por uso
    // recente só faz sentido quando o chamador está filtrando por tipo de
    // serviço (fluxo de seleção de materiais de um serviço).
    const rows = await this.db
      .select()
      .from(schema.materials)
      .where(and(...conditions))
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

  async findServiceTypeIdsByMaterial(
    materialId: string,
    orgId: string,
  ): Promise<string[]> {
    const rows = await this.db
      .select({ serviceTypeId: schema.materialServiceTypes.serviceTypeId })
      .from(schema.materialServiceTypes)
      .where(
        and(
          eq(schema.materialServiceTypes.materialId, materialId),
          eq(schema.materialServiceTypes.orgId, orgId),
        ),
      );
    return rows.map((r) => r.serviceTypeId);
  }

  async findServiceTypeIdsByMaterials(
    orgId: string,
    materialIds: string[],
  ): Promise<Record<string, string[]>> {
    if (materialIds.length === 0) return {};

    const rows = await this.db
      .select({
        materialId: schema.materialServiceTypes.materialId,
        serviceTypeId: schema.materialServiceTypes.serviceTypeId,
      })
      .from(schema.materialServiceTypes)
      .where(
        and(
          eq(schema.materialServiceTypes.orgId, orgId),
          inArray(schema.materialServiceTypes.materialId, materialIds),
        ),
      );

    const result: Record<string, string[]> = {};
    for (const materialId of materialIds) {
      result[materialId] = [];
    }
    for (const row of rows) {
      result[row.materialId]!.push(row.serviceTypeId);
    }
    return result;
  }

  async setServiceTypes(
    materialId: string,
    orgId: string,
    serviceTypeIds: string[],
  ): Promise<void> {
    // Delete-all + insert: o array recebido é a verdade declarada do vínculo,
    // não um diff — mantém a operação idempotente sem depender de estado prévio.
    await this.db.transaction(async (tx) => {
      await tx
        .delete(schema.materialServiceTypes)
        .where(
          and(
            eq(schema.materialServiceTypes.materialId, materialId),
            eq(schema.materialServiceTypes.orgId, orgId),
          ),
        );

      if (serviceTypeIds.length === 0) return;

      await tx.insert(schema.materialServiceTypes).values(
        serviceTypeIds.map((serviceTypeId) => ({
          orgId,
          materialId,
          serviceTypeId,
        })),
      );
    });
  }

  async countServiceTypesInOrg(orgId: string, ids: string[]): Promise<number> {
    if (ids.length === 0) return 0;
    const [row] = await this.db
      .select({ total: count() })
      .from(schema.serviceTypes)
      .where(
        and(
          eq(schema.serviceTypes.orgId, orgId),
          inArray(schema.serviceTypes.id, ids),
        ),
      );
    return Number(row?.total ?? 0);
  }
}

