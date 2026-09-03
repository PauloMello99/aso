import type { OrgRole } from "./org.entity";

export type MemberClassification = "resident" | "guest";

export interface MemberEntityProps {
  memberId: string;
  orgId: string;
  userId: string;
  role: OrgRole;
  classification?: MemberClassification | null;
  enabled: boolean;
  permissions: string[];
  userName: string;
  userEmail: string;
  joinedAt: Date;
}

export class MemberEntity {
  readonly memberId: string;
  readonly orgId: string;
  readonly userId: string;
  readonly role: OrgRole;
  readonly classification: MemberClassification | null;
  readonly enabled: boolean;
  readonly permissions: string[];
  readonly userName: string;
  readonly userEmail: string;
  readonly joinedAt: Date;

  private constructor(props: MemberEntityProps) {
    this.memberId = props.memberId;
    this.orgId = props.orgId;
    this.userId = props.userId;
    this.role = props.role;
    this.classification = props.classification ?? null;
    this.enabled = props.enabled;
    this.permissions = props.permissions ?? [];
    this.userName = props.userName;
    this.userEmail = props.userEmail;
    this.joinedAt = props.joinedAt;
  }

  static create(props: MemberEntityProps): MemberEntity {
    return new MemberEntity(props);
  }
}
