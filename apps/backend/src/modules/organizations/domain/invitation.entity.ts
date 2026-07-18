import type { OrgRole } from "./org.entity";

export type InvitationStatus = "pending" | "accepted" | "expired" | "cancelled";

export interface InvitationEntityProps {
  id: string;
  orgId: string;
  invitedBy: string;
  email: string;
  role: OrgRole;
  status: InvitationStatus;
  token: string;
  expiresAt: Date;
  createdAt: Date;
}

export class InvitationEntity {
  readonly id: string;
  readonly orgId: string;
  readonly invitedBy: string;
  readonly email: string;
  readonly role: OrgRole;
  readonly status: InvitationStatus;
  readonly token: string;
  readonly expiresAt: Date;
  readonly createdAt: Date;

  private constructor(props: InvitationEntityProps) {
    this.id = props.id;
    this.orgId = props.orgId;
    this.invitedBy = props.invitedBy;
    this.email = props.email;
    this.role = props.role;
    this.status = props.status;
    this.token = props.token;
    this.expiresAt = props.expiresAt;
    this.createdAt = props.createdAt;
  }

  isAcceptable(now: Date = new Date()): boolean {
    return this.status === "pending" && this.expiresAt > now;
  }

  static create(props: InvitationEntityProps): InvitationEntity {
    return new InvitationEntity(props);
  }
}
