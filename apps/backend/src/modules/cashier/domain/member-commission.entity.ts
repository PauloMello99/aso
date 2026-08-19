export type CommissionMode = "gross" | "net";

export interface MemberCommissionEntityProps {
  id: string;
  orgId: string;
  userId: string;
  percent: string;
  mode: CommissionMode;
  active: boolean;
  supersededAt: Date | null;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class MemberCommissionEntity {
  readonly id: string;
  readonly orgId: string;
  readonly userId: string;
  readonly percent: string;
  readonly mode: CommissionMode;
  readonly active: boolean;
  readonly supersededAt: Date | null;
  readonly createdBy: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(props: MemberCommissionEntityProps) {
    this.id = props.id;
    this.orgId = props.orgId;
    this.userId = props.userId;
    this.percent = props.percent;
    this.mode = props.mode;
    this.active = props.active;
    this.supersededAt = props.supersededAt;
    this.createdBy = props.createdBy;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static create(props: MemberCommissionEntityProps): MemberCommissionEntity {
    return new MemberCommissionEntity(props);
  }
}
