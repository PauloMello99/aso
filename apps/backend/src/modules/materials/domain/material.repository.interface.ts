import {
  CreateMaterialData,
  MaterialEntity,
  UpdateMaterialData,
} from "./material.entity";

export const MATERIAL_REPOSITORY = Symbol("MATERIAL_REPOSITORY");

export interface ListMaterialsFilter {
  categoryId?: string;
  lowStockOnly?: boolean;
  name?: string;
  archived?: boolean;
  shareable?: boolean;
  minCost?: string;
  maxCost?: string;
  sortBy?: "lastUsed" | "name";
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
  touchLastUsed(id: string): Promise<void>;
  setArchived(id: string, orgId: string, archived: boolean): Promise<MaterialEntity>;
  isLinkedToService(id: string): Promise<boolean>;
  delete(id: string, orgId: string): Promise<void>;
}

