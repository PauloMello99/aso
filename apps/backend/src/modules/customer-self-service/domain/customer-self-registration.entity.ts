export type CustomerSelfRegistrationStatus = "pending" | "submitted";

export interface CustomerSelfRegistrationEntityProps {
  id: string;
  orgId: string;
  serviceTypeId: string | null;
  email: string;
  token: string;
  anamnesisResponseId: string | null;
  customerId: string | null;
  status: CustomerSelfRegistrationStatus;
  expiresAt: Date;
  submittedAt: Date | null;
  createdBy: string | null;
  createdAt: Date;
}

export class CustomerSelfRegistrationEntity {
  readonly id: string;
  readonly orgId: string;
  readonly serviceTypeId: string | null;
  readonly email: string;
  readonly token: string;
  readonly anamnesisResponseId: string | null;
  readonly customerId: string | null;
  readonly status: CustomerSelfRegistrationStatus;
  readonly expiresAt: Date;
  readonly submittedAt: Date | null;
  readonly createdBy: string | null;
  readonly createdAt: Date;

  private constructor(props: CustomerSelfRegistrationEntityProps) {
    this.id = props.id;
    this.orgId = props.orgId;
    this.serviceTypeId = props.serviceTypeId;
    this.email = props.email;
    this.token = props.token;
    this.anamnesisResponseId = props.anamnesisResponseId;
    this.customerId = props.customerId;
    this.status = props.status;
    this.expiresAt = props.expiresAt;
    this.submittedAt = props.submittedAt;
    this.createdBy = props.createdBy;
    this.createdAt = props.createdAt;
  }

  get isExpired(): boolean {
    return this.status === "pending" && this.expiresAt < new Date();
  }

  get displayStatus(): CustomerSelfRegistrationStatus | "expired" {
    return this.isExpired ? "expired" : this.status;
  }

  static create(
    props: CustomerSelfRegistrationEntityProps,
  ): CustomerSelfRegistrationEntity {
    return new CustomerSelfRegistrationEntity(props);
  }
}
