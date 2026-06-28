import { Inject, Injectable } from "@nestjs/common";
import { MaterialNotFoundException } from "../../domain/exceptions/material-not-found.exception";
import { MaterialEntity } from "../../domain/material.entity";
import {
  IMaterialRepository,
  MATERIAL_REPOSITORY,
} from "../../domain/material.repository.interface";

@Injectable()
export class SetMaterialArchivedUseCase {
  constructor(
    @Inject(MATERIAL_REPOSITORY)
    private readonly materialRepo: IMaterialRepository,
  ) {}

  async execute(
    id: string,
    orgId: string,
    archived: boolean,
  ): Promise<MaterialEntity> {
    const existing = await this.materialRepo.findById(id, orgId);
    if (!existing) throw new MaterialNotFoundException(id);
    return this.materialRepo.setArchived(id, orgId, archived);
  }
}
