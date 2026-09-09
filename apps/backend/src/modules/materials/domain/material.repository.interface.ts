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
  findPageByOrg(
    orgId: string,
    filter: ListMaterialsFilter | undefined,
    pagination: { limit: number; offset: number },
  ): Promise<{ rows: MaterialEntity[]; total: number }>;
  findOptionsByOrg(
    orgId: string,
    params: { limit: number; search?: string; serviceTypeId?: string },
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
  findServiceTypeIdsByMaterial(
    materialId: string,
    orgId: string,
  ): Promise<string[]>;
  findServiceTypeIdsByMaterials(
    orgId: string,
    materialIds: string[],
  ): Promise<Record<string, string[]>>;
  setServiceTypes(
    materialId: string,
    orgId: string,
    serviceTypeIds: string[],
  ): Promise<void>;
  countServiceTypesInOrg(orgId: string, ids: string[]): Promise<number>;
}

