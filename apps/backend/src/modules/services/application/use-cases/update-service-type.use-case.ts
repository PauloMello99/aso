import { Inject, Injectable } from "@nestjs/common";
import { ServiceTypeEntity } from "../../domain/service-type.entity";
import {
  IServiceTypeRepository,
  SERVICE_TYPE_REPOSITORY,
  UpdateServiceTypeData,
} from "../../domain/service-type.repository.interface";
import { ServiceTypeNotFoundException } from "../../domain/exceptions/service-type-not-found.exception";

@Injectable()
export class UpdateServiceTypeUseCase {
  constructor(
    @Inject(SERVICE_TYPE_REPOSITORY)
    private readonly typeRepo: IServiceTypeRepository,
  ) {}

  async execute(
    orgId: string,
    id: string,
    data: UpdateServiceTypeData,
  ): Promise<ServiceTypeEntity> {
    const updated = await this.typeRepo.update(id, orgId, data);
    if (!updated) throw new ServiceTypeNotFoundException(id);
    return updated;
  }
}
