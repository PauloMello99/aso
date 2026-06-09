import { StockMovementType } from "./material.entity";

export interface StockMovementEntityProps {
  id: string;
  orgId: string;
  materialId: string;
  type: StockMovementType;
  quantityDelta: string; // numeric string â€” positive = in, negative = out
  serviceId: string | null;
  note: string | null;
  createdBy: string | null;
  createdAt: Date;
}

export interface CreateStockMovementData {
  orgId: string;
  materialId: string;
  type: StockMovementType;
  quantityDelta: string;
  serviceId?: string | null;
  note?: string | null;
  createdBy?: string | null;
}

export class StockMovementEntity {
  readonly id: string;
  readonly orgId: string;
  readonly materialId: string;
  readonly type: StockMovementType;
  readonly quantityDelta: string;
  readonly serviceId: string | null;
  readonly note: string | null;
  readonly createdBy: string | null;
  readonly createdAt: Date;

  private constructor(props: StockMovementEntityProps) {
    this.id = props.id;
    this.orgId = props.orgId;
    this.materialId = props.materialId;
    this.type = props.type;
    this.quantityDelta = props.quantityDelta;
    this.serviceId = props.serviceId;
    this.note = props.note;
    this.createdBy = props.createdBy;
    this.createdAt = props.createdAt;
  }

  static create(props: StockMovementEntityProps): StockMovementEntity {
    return new StockMovementEntity(props);
  }
}

