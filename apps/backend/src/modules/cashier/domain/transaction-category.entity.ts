export interface TransactionCategoryProps {
  id: string;
  orgId: string;
  name: string;
  createdAt: Date;
}

export class TransactionCategoryEntity {
  readonly id: string;
  readonly orgId: string;
  readonly name: string;
  readonly createdAt: Date;

  private constructor(props: TransactionCategoryProps) {
    this.id = props.id;
    this.orgId = props.orgId;
    this.name = props.name;
    this.createdAt = props.createdAt;
  }

  static create(props: TransactionCategoryProps): TransactionCategoryEntity {
    return new TransactionCategoryEntity(props);
  }
}
