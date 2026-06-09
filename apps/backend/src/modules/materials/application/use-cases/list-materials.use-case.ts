import { Inject, Injectable } from "@nestjs/common";
import { MaterialEntity } from "../../domain/material.entity";
import {
  IMaterialRepository,
  ListMaterialsFilter,
  MATERIAL_REPOSITORY,
} from "../../domain/material.repository.interface";

@Injectable()
export class ListMaterialsUseCase {
  constructor(
    @Inject(MATERIAL_REPOSITORY)
    private readonly materialRepo: IMaterialRepository,
  ) {}

  async execute(
    orgId: string,
    filter?: ListMaterialsFilter,
  ): Promise<MaterialEntity[]> {
    return this.materialRepo.findAllByOrg(orgId, filter);
  }
}

