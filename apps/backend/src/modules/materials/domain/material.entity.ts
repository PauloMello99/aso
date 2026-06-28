export type StockMovementType =
  | "restock"
  | "service_consumption"
  | "manual_adjustment";

export interface MaterialEntityProps {
  id: string;
  orgId: string;
  categoryId: string | null;
  name: string;
  stockQuantity: string; // numeric string from DB (numeric(10,2))
  minimumQuantity: string;
  costPerUnit: string | null;
  shareable: boolean;
  lastUsedAt: Date | null;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateMaterialData {
  orgId: string;
  categoryId?: string | null;
  name: string;
  minimumQuantity?: string;
  costPerUnit?: string | null;
  shareable?: boolean;
}

export interface UpdateMaterialData {
  categoryId?: string | null;
  name?: string;
  minimumQuantity?: string;
  costPerUnit?: string | null;
  shareable?: boolean;
}

export class MaterialEntity {
  readonly id: string;
  readonly orgId: string;
  readonly categoryId: string | null;
  readonly name: string;
  readonly stockQuantity: string;
  readonly minimumQuantity: string;
  readonly costPerUnit: string | null;
  readonly shareable: boolean;
  readonly lastUsedAt: Date | null;
  readonly archivedAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(props: MaterialEntityProps) {
    this.id = props.id;
    this.orgId = props.orgId;
    this.categoryId = props.categoryId;
    this.name = props.name;
    this.stockQuantity = props.stockQuantity;
    this.minimumQuantity = props.minimumQuantity;
    this.costPerUnit = props.costPerUnit;
    this.shareable = props.shareable;
    this.lastUsedAt = props.lastUsedAt;
    this.archivedAt = props.archivedAt;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  get isArchived(): boolean {
    return this.archivedAt !== null;
  }

  static create(props: MaterialEntityProps): MaterialEntity {
    return new MaterialEntity(props);
  }

  get isLowStock(): boolean {
    const minQty = parseFloat(this.minimumQuantity);
    const stock = parseFloat(this.stockQuantity);
    return minQty > 0 && stock <= minQty;
  }
}

