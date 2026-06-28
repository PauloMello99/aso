import type { Material as MaterialRow } from "../../../../database/schema/studio/materials";
import { MaterialEntity } from "../../domain/material.entity";

export class MaterialMapper {
  static toDomain(row: MaterialRow): MaterialEntity {
    return MaterialEntity.create({
      id: row.id,
      orgId: row.orgId,
      categoryId: row.categoryId ?? null,
      name: row.name,
      stockQuantity: row.stockQuantity,
      minimumQuantity: row.minimumQuantity,
      costPerUnit: row.costPerUnit ?? null,
      shareable: row.shareable,
      lastUsedAt: row.lastUsedAt ?? null,
      archivedAt: row.archivedAt ?? null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
  }
}

