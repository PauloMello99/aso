import { Inject, Injectable } from "@nestjs/common";
import {
  buildPaginated,
  Paginated,
  resolvePageRequest,
} from "../../../../common/pagination/pagination";
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
import {
  MaterialListItemView,
  toMaterialListItemView,
} from "./list-materials.use-case";

const PAGINATION_BOUNDS = { defaultLimit: 50, maxLimit: 200 };

@Injectable()
export class ListMaterialsPageUseCase {
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
    page?: number,
    limit?: number,
  ): Promise<Paginated<MaterialListItemView>> {
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

    const {
      page: resolvedPage,
      limit: resolvedLimit,
      offset,
    } = resolvePageRequest({ page, limit }, PAGINATION_BOUNDS);

    const { rows, total } = await this.materialRepo.findPageByOrg(
      orgId,
      safeFilter,
      { limit: resolvedLimit, offset },
    );

    const views = rows.map((m) => toMaterialListItemView(m, canSeeCost));

    return buildPaginated(views, total, resolvedPage, resolvedLimit);
  }
}
