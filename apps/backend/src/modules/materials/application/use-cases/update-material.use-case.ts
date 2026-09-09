import { Inject, Injectable } from "@nestjs/common";
import { MaterialEntity, UpdateMaterialData } from "../../domain/material.entity";
import { MaterialNotFoundException } from "../../domain/exceptions/material-not-found.exception";
import { MaterialServiceTypeInvalidException } from "../../domain/exceptions/material-service-type-invalid.exception";
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

    if (data.serviceTypeIds !== undefined) {
      if (data.serviceTypeIds.length > 0) {
        const count = await this.materialRepo.countServiceTypesInOrg(
          orgId,
          data.serviceTypeIds,
        );
        if (count !== data.serviceTypeIds.length) {
          throw new MaterialServiceTypeInvalidException();
        }
      }
      await this.materialRepo.setServiceTypes(id, orgId, data.serviceTypeIds);
    }

    const updated = await this.materialRepo.update(id, data);
    const serviceTypeIds =
      data.serviceTypeIds ??
      (await this.materialRepo.findServiceTypeIdsByMaterial(id, orgId));

    return MaterialEntity.create({ ...updated, serviceTypeIds });
  }
}

