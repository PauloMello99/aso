import type { ServiceTypeEntity } from "./service-type.entity";

export const SERVICE_TYPE_REPOSITORY = Symbol("SERVICE_TYPE_REPOSITORY");

export interface UpdateServiceTypeData {
  name?: string;
  description?: string | null;
  requiresAgeVerification?: boolean;
}

export interface IServiceTypeRepository {
  findByOrg(orgId: string): Promise<ServiceTypeEntity[]>;
  findById(id: string, orgId: string): Promise<ServiceTypeEntity | null>;
  create(
    orgId: string,
    name: string,
    description?: string | null,
    requiresAgeVerification?: boolean,
  ): Promise<ServiceTypeEntity>;
  update(
    id: string,
    orgId: string,
    data: UpdateServiceTypeData,
  ): Promise<ServiceTypeEntity | null>;
}
