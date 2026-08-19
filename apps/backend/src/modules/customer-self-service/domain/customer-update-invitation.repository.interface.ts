import type { CustomerUpdateInvitationEntity } from "./customer-update-invitation.entity";

export const CUSTOMER_UPDATE_INVITATION_REPOSITORY = Symbol(
  "CUSTOMER_UPDATE_INVITATION_REPOSITORY",
);

export interface CreateCustomerUpdateInvitationData {
  orgId: string;
  customerId: string;
  createdBy: string | null;
}

export type CustomerUpdateInvitationWithContext =
  CustomerUpdateInvitationEntity & {
    organizationName: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string | null;
    customerBirthDate: string;
    customerAddress: string;
    customerNumber: string;
    customerAddressLine2: string | null;
    customerCity: string;
    customerState: string;
    customerPostalCode: string | null;
    customerCountry: string | null;
  };

export interface ICustomerUpdateInvitationRepository {
  create(
    data: CreateCustomerUpdateInvitationData,
  ): Promise<CustomerUpdateInvitationEntity>;

  findPendingByCustomer(
    orgId: string,
    customerId: string,
  ): Promise<CustomerUpdateInvitationEntity | null>;

  delete(id: string): Promise<void>;

  findByToken(
    token: string,
  ): Promise<CustomerUpdateInvitationWithContext | null>;

  markSubmitted(id: string): Promise<boolean>;
}
