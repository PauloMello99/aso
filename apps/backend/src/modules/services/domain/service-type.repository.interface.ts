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
  /** Cria (ou retorna a existente, por UNIQUE org+name). */
  create(
    orgId: string,
    name: string,
    description?: string | null,
    requiresAgeVerification?: boolean,
  ): Promise<ServiceTypeEntity>;
  /** Atualiza só os campos presentes em `data`. `null` se não existir na org. */
  update(
    id: string,
    orgId: string,
    data: UpdateServiceTypeData,
  ): Promise<ServiceTypeEntity | null>;
}
