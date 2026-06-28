export interface ServiceTypeProps {
  id: string;
  orgId: string;
  name: string;
  description: string | null;
}

export class ServiceTypeEntity {
  readonly id: string;
  readonly orgId: string;
  readonly name: string;
  readonly description: string | null;

  private constructor(props: ServiceTypeProps) {
    this.id = props.id;
    this.orgId = props.orgId;
    this.name = props.name;
    this.description = props.description;
  }

  static create(props: ServiceTypeProps): ServiceTypeEntity {
    return new ServiceTypeEntity(props);
  }
}
