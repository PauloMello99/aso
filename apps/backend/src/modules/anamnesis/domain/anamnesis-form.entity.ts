export interface AnamnesisFormProps {
  id: string;
  orgId: string;
  serviceTypeId: string;
  createdAt: Date;
}

export class AnamnesisFormEntity {
  readonly id: string;
  readonly orgId: string;
  readonly serviceTypeId: string;
  readonly createdAt: Date;

  private constructor(props: AnamnesisFormProps) {
    this.id = props.id;
    this.orgId = props.orgId;
    this.serviceTypeId = props.serviceTypeId;
    this.createdAt = props.createdAt;
  }

  static create(props: AnamnesisFormProps): AnamnesisFormEntity {
    return new AnamnesisFormEntity(props);
  }
}
