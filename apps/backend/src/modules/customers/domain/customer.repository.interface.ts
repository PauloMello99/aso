import {
  CreateCustomerData,
  CustomerEntity,
  UpdateCustomerData,
} from "./customer.entity";

export const CUSTOMER_REPOSITORY = Symbol("CUSTOMER_REPOSITORY");

export interface ListCustomersFilter {
  /** Case-insensitive match against name / email / phone */
  search?: string;
  /** When true, only enabled (active) customers are returned */
  enabledOnly?: boolean;
}

export interface ICustomerRepository {
  findById(id: string, orgId: string): Promise<CustomerEntity | null>;
  findAllByOrg(
    orgId: string,
    filter?: ListCustomersFilter,
  ): Promise<CustomerEntity[]>;
  create(data: CreateCustomerData): Promise<CustomerEntity>;
  update(id: string, data: UpdateCustomerData): Promise<CustomerEntity>;
  delete(id: string, orgId: string): Promise<void>;
}
