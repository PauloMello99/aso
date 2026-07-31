export interface TransactionCategoryProps {
  id: string;
  orgId: string;
  name: string;
  isProtected: boolean;
  systemKey: string | null;
  createdAt: Date;
}

export class TransactionCategoryEntity {
  readonly id: string;
  readonly orgId: string;
  readonly name: string;
  readonly isProtected: boolean;
  readonly systemKey: string | null;
  readonly createdAt: Date;

  private constructor(props: TransactionCategoryProps) {
    this.id = props.id;
    this.orgId = props.orgId;
    this.name = props.name;
    this.isProtected = props.isProtected;
    this.systemKey = props.systemKey;
    this.createdAt = props.createdAt;
  }

  static create(props: TransactionCategoryProps): TransactionCategoryEntity {
    return new TransactionCategoryEntity(props);
  }
}
