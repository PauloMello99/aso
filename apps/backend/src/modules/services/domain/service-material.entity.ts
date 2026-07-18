export interface ServiceMaterialProps {
  id: string;
  serviceId: string;
  materialId: string;
  quantity: string;
  materialName?: string | null;
}

export class ServiceMaterialEntity {
  readonly id: string;
  readonly serviceId: string;
  readonly materialId: string;
  readonly quantity: string;
  readonly materialName: string | null;

  private constructor(props: ServiceMaterialProps) {
    this.id = props.id;
    this.serviceId = props.serviceId;
    this.materialId = props.materialId;
    this.quantity = props.quantity;
    this.materialName = props.materialName ?? null;
  }

  static create(props: ServiceMaterialProps): ServiceMaterialEntity {
    return new ServiceMaterialEntity(props);
  }
}
