import { Inject, Injectable } from "@nestjs/common";
import { MaterialEntity, UpdateMaterialData } from "../../domain/material.entity";
import { MaterialNotFoundException } from "../../domain/exceptions/material-not-found.exception";
import {
  IMaterialRepository,
  MATERIAL_REPOSITORY,
} from "../../domain/material.repository.interface";

@Injectable()
export class UpdateMaterialUseCase {
  constructor(
    @Inject(MATERIAL_REPOSITORY)
    private readonly materialRepo: IMaterialRepository,
  ) {}

  async execute(
    id: string,
    orgId: string,
    data: UpdateMaterialData,
  ): Promise<MaterialEntity> {
    const existing = await this.materialRepo.findById(id, orgId);
    if (!existing) throw new MaterialNotFoundException(id);
    return this.materialRepo.update(id, data);
  }
}

