export const CUSTOMER_ORIGIN_REPOSITORY = Symbol("CUSTOMER_ORIGIN_REPOSITORY");

export interface CustomerOriginDto {
  id: string;
  name: string;
}

export interface ICustomerOriginRepository {
  findByOrg(orgId: string): Promise<CustomerOriginDto[]>;
}
