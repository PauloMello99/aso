import {
  CreateMaterialData,
  MaterialEntity,
  UpdateMaterialData,
} from "./material.entity";

export const MATERIAL_REPOSITORY = Symbol("MATERIAL_REPOSITORY");

export interface ListMaterialsFilter {
  categoryId?: string;
  lowStockOnly?: boolean;
  /** Busca textual no nome (ilike). */
  name?: string;
  /** true = lista só arquivados; default/false = só ativos. */
  archived?: boolean;
  /** Ordenação: padrão = último usado primeiro. */
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
  /** Marca a última vez que o material foi consumido (ordenação). */
  touchLastUsed(id: string): Promise<void>;
  /** Arquiva (archivedAt = now) ou desarquiva (null). */
  setArchived(id: string, orgId: string, archived: boolean): Promise<MaterialEntity>;
  /** True if the material is referenced by any service (service_materials). */
  isLinkedToService(id: string): Promise<boolean>;
  delete(id: string, orgId: string): Promise<void>;
}

