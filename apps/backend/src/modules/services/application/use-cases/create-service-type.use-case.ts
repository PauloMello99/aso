import { Inject, Injectable } from "@nestjs/common";
import {
  IServiceTypeRepository,
  SERVICE_TYPE_REPOSITORY,
} from "../../domain/service-type.repository.interface";
import { ServiceTypeEntity } from "../../domain/service-type.entity";

@Injectable()
export class CreateServiceTypeUseCase {
  constructor(
    @Inject(SERVICE_TYPE_REPOSITORY)
    private readonly typeRepo: IServiceTypeRepository,
  ) {}

  execute(
    orgId: string,
    name: string,
    description?: string | null,
  ): Promise<ServiceTypeEntity> {
    return this.typeRepo.create(orgId, name, description ?? null);
  }
}
