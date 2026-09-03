import { Inject, Injectable } from "@nestjs/common";
import { MaterialEntity } from "../../domain/material.entity";
import {
  IMaterialRepository,
  ListMaterialsFilter,
  MATERIAL_REPOSITORY,
} from "../../domain/material.repository.interface";
import {
  IMemberRepository,
  MEMBER_REPOSITORY,
} from "../../../organizations/domain/member.repository.interface";
import { hasModuleAccess } from "../../../organizations/domain/member-permissions";

export type MaterialListItemView = Omit<
  MaterialEntity,
  "costPerUnit" | "isArchived" | "isLowStock"
> & {
  costPerUnit?: string | null;
  isArchived?: boolean;
  isLowStock?: boolean;
};

export function toMaterialListItemView(
  material: MaterialEntity,
  canSeeCost: boolean,
): MaterialListItemView {
  if (canSeeCost) return material;
  const {
    id,
    orgId,
    categoryId,
    name,
    stockQuantity,
    minimumQuantity,
    shareable,
    lastUsedAt,
    archivedAt,
    createdAt,
    updatedAt,
  } = material;
  return {
    id,
    orgId,
    categoryId,
    name,
    stockQuantity,
    minimumQuantity,
    shareable,
    lastUsedAt,
    archivedAt,
    createdAt,
    updatedAt,
  };
}

// Caminho NÃO paginado — usado por ExportMaterialsUseCase e GetOverviewUseCase (lowStock); listagem paginada vive em ListMaterialsPageUseCase.
@Injectable()
export class ListMaterialsUseCase {
  constructor(
    @Inject(MATERIAL_REPOSITORY)
    private readonly materialRepo: IMaterialRepository,
    @Inject(MEMBER_REPOSITORY)
    private readonly memberRepo: IMemberRepository,
  ) {}

  async execute(
    orgId: string,
    filter?: ListMaterialsFilter,
    authId?: string,
  ): Promise<MaterialListItemView[]> {
    let canSeeCost = false;
    if (authId) {
      const member = await this.memberRepo.findByAuthId(orgId, authId);
      canSeeCost = member
        ? hasModuleAccess(member.role, member.permissions, "stock")
        : false;
    }

    const safeFilter = canSeeCost
      ? filter
      : filter && { ...filter, minCost: undefined, maxCost: undefined };

    const materials = await this.materialRepo.findAllByOrg(orgId, safeFilter);
    return materials.map((m) => toMaterialListItemView(m, canSeeCost));
  }
}
