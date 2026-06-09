import {
  CreateMaterialData,
  MaterialEntity,
  UpdateMaterialData,
} from "./material.entity";

export const MATERIAL_REPOSITORY = Symbol("MATERIAL_REPOSITORY");

export interface ListMaterialsFilter {
  categoryId?: string;
  lowStockOnly?: boolean;
}

export interface IMaterialRepository {
  findById(id: string, orgId: string): Promise<MaterialEntity | null>;
  findAllByOrg(
    orgId: string,
    filter?: ListMaterialsFilter,
  ): Promise<MaterialEntity[]>;
  create(data: CreateMaterialData): Promise<MaterialEntity>;
  update(id: string, data: UpdateMaterialData): Promise<MaterialEntity>;
  updateStockQuantity(
    id: string,
    delta: string,
  ): Promise<MaterialEntity>;
  delete(id: string, orgId: string): Promise<void>;
}

