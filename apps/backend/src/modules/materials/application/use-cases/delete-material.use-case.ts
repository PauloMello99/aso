import { Inject, Injectable } from "@nestjs/common";
import { MaterialNotFoundException } from "../../domain/exceptions/material-not-found.exception";
import { MaterialInUseException } from "../../domain/exceptions/material-in-use.exception";
import {
  IMaterialRepository,
  MATERIAL_REPOSITORY,
} from "../../domain/material.repository.interface";

@Injectable()
export class DeleteMaterialUseCase {
  constructor(
    @Inject(MATERIAL_REPOSITORY)
    private readonly materialRepo: IMaterialRepository,
  ) {}

  async execute(id: string, orgId: string): Promise<void> {
    const existing = await this.materialRepo.findById(id, orgId);
    if (!existing) throw new MaterialNotFoundException(id);
    if (await this.materialRepo.isLinkedToService(id)) {
      throw new MaterialInUseException(id);
    }
    await this.materialRepo.delete(id, orgId);
  }
}

