import { Inject, Injectable } from "@nestjs/common";
import {
  IMaterialRepository,
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

const MAX_OPTIONS = 1000;

@Injectable()
export class ListMaterialOptionsUseCase {
  constructor(
    @Inject(MATERIAL_REPOSITORY)
    private readonly materialRepo: IMaterialRepository,
    @Inject(MEMBER_REPOSITORY)
    private readonly memberRepo: IMemberRepository,
  ) {}

  async execute(
    orgId: string,
    authId?: string,
  ): Promise<{ data: MaterialListItemView[]; truncated: boolean }> {
    let canSeeCost = false;
    if (authId) {
      const member = await this.memberRepo.findByAuthId(orgId, authId);
      canSeeCost = member
        ? hasModuleAccess(member.role, member.permissions, "stock")
        : false;
    }

    const materials = await this.materialRepo.findOptionsByOrg(orgId, {
      limit: MAX_OPTIONS,
    });

    const truncated = materials.length > MAX_OPTIONS;
    const page = truncated ? materials.slice(0, MAX_OPTIONS) : materials;

    return {
      data: page.map((m) => toMaterialListItemView(m, canSeeCost)),
      truncated,
    };
  }
}
