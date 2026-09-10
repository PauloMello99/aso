import { Inject, Injectable } from "@nestjs/common";
import { CreateMaterialData, MaterialEntity } from "../../domain/material.entity";
import { MaterialServiceTypeInvalidException } from "../../domain/exceptions/material-service-type-invalid.exception";
import {
  IMaterialRepository,
  MATERIAL_REPOSITORY,
} from "../../domain/material.repository.interface";

@Injectable()
export class CreateMaterialUseCase {
  constructor(
    @Inject(MATERIAL_REPOSITORY)
    private readonly materialRepo: IMaterialRepository,
  ) {}

  async execute(data: CreateMaterialData): Promise<MaterialEntity> {
    const serviceTypeIds = data.serviceTypeIds ?? [];
    if (serviceTypeIds.length > 0) {
      const count = await this.materialRepo.countServiceTypesInOrg(
        data.orgId,
        serviceTypeIds,
      );
      if (count !== serviceTypeIds.length) {
        throw new MaterialServiceTypeInvalidException();
      }
    }

    const created = await this.materialRepo.create(data);

    if (serviceTypeIds.length > 0) {
      await this.materialRepo.setServiceTypes(
        created.id,
        data.orgId,
        serviceTypeIds,
      );
    }

    return MaterialEntity.create({ ...created, serviceTypeIds });
  }
}

