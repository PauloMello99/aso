import {
  CreateCustomerData,
  CustomerEntity,
  UpdateCustomerData,
} from "./customer.entity";

export const CUSTOMER_REPOSITORY = Symbol("CUSTOMER_REPOSITORY");

export interface ListCustomersFilter {
  search?: string;
  enabledOnly?: boolean;
  originId?: string;
  gender?: "male" | "female" | "other";
  status?: "active" | "inactive";
  from?: Date;
  to?: Date;
  birthMonth?: number;
  city?: string;
  state?: string;
}

export interface ICustomerRepository {
  findById(id: string, orgId: string): Promise<CustomerEntity | null>;
  findByEmail(
    orgId: string,
    email: string,
    excludeId?: string,
  ): Promise<CustomerEntity | null>;
  findAllByOrg(
    orgId: string,
    filter?: ListCustomersFilter,
  ): Promise<CustomerEntity[]>;
  findPageByOrg(
    orgId: string,
    filter: ListCustomersFilter | undefined,
    pagination: { limit: number; offset: number },
  ): Promise<{ rows: CustomerEntity[]; total: number }>;
  findOptionsByOrg(
    orgId: string,
    params: { enabledOnly?: boolean; limit: number },
  ): Promise<{ id: string; name: string }[]>;
  create(data: CreateCustomerData): Promise<CustomerEntity>;
  update(id: string, data: UpdateCustomerData): Promise<CustomerEntity>;
  delete(id: string, orgId: string): Promise<void>;
}
