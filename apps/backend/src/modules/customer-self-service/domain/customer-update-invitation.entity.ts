export type CustomerUpdateInvitationStatus = "pending" | "submitted";

export interface CustomerUpdateInvitationEntityProps {
  id: string;
  orgId: string;
  customerId: string;
  token: string;
  status: CustomerUpdateInvitationStatus;
  expiresAt: Date;
  submittedAt: Date | null;
  createdBy: string | null;
  createdAt: Date;
}

export class CustomerUpdateInvitationEntity {
  readonly id: string;
  readonly orgId: string;
  readonly customerId: string;
  readonly token: string;
  readonly status: CustomerUpdateInvitationStatus;
  readonly expiresAt: Date;
  readonly submittedAt: Date | null;
  readonly createdBy: string | null;
  readonly createdAt: Date;

  private constructor(props: CustomerUpdateInvitationEntityProps) {
    this.id = props.id;
    this.orgId = props.orgId;
    this.customerId = props.customerId;
    this.token = props.token;
    this.status = props.status;
    this.expiresAt = props.expiresAt;
    this.submittedAt = props.submittedAt;
    this.createdBy = props.createdBy;
    this.createdAt = props.createdAt;
  }

  get isExpired(): boolean {
    return this.status === "pending" && this.expiresAt < new Date();
  }

  get displayStatus(): CustomerUpdateInvitationStatus | "expired" {
    return this.isExpired ? "expired" : this.status;
  }

  static create(
    props: CustomerUpdateInvitationEntityProps,
  ): CustomerUpdateInvitationEntity {
    return new CustomerUpdateInvitationEntity(props);
  }
}
