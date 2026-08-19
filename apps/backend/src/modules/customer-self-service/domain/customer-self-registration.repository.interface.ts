import type { CustomerSelfRegistrationEntity } from "./customer-self-registration.entity";

export const CUSTOMER_SELF_REGISTRATION_REPOSITORY = Symbol(
  "CUSTOMER_SELF_REGISTRATION_REPOSITORY",
);

export interface CreateCustomerSelfRegistrationData {
  orgId: string;
  email: string;
  serviceTypeId: string | null;
  anamnesisResponseId: string | null;
  createdBy: string | null;
}

export type CustomerSelfRegistrationWithContext =
  CustomerSelfRegistrationEntity & {
    organizationName: string;
    serviceTypeName: string | null;
    anamnesisToken: string | null;
  };

export interface ICustomerSelfRegistrationRepository {
  create(
    data: CreateCustomerSelfRegistrationData,
  ): Promise<CustomerSelfRegistrationEntity>;

  findPendingByEmail(
    orgId: string,
    email: string,
  ): Promise<CustomerSelfRegistrationEntity | null>;

  delete(id: string): Promise<void>;

  findByToken(
    token: string,
  ): Promise<CustomerSelfRegistrationWithContext | null>;

  linkCustomer(id: string, customerId: string): Promise<void>;

  markSubmitted(id: string, customerId: string): Promise<boolean>;
}
