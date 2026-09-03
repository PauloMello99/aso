export type Gender = "male" | "female" | "other";

export interface CustomerEntityProps {
  id: string;
  orgId: string;
  userId: string | null;
  originId: string | null;
  createdBy: string | null;
  name: string;
  email: string;
  phone: string | null;
  birthDate: string;
  gender: Gender | null;
  address: string;
  // number/city/state: nullable para clientes importados do legado Ink House (0071).
  // Criação nova continua exigindo (CreateCustomerData abaixo mantém string).
  number: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  notes: string | null;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCustomerData {
  orgId: string;
  createdBy?: string | null;
  originId?: string | null;
  name: string;
  email: string;
  phone?: string | null;
  birthDate: string;
  gender?: Gender | null;
  address: string;
  number: string;
  addressLine2?: string | null;
  city: string;
  state: string;
  postalCode?: string | null;
  country?: string | null;
  notes?: string | null;
}

export interface UpdateCustomerData {
  originId?: string | null;
  name?: string;
  email?: string;
  phone?: string | null;
  birthDate?: string;
  gender?: Gender | null;
  address?: string;
  number?: string;
  addressLine2?: string | null;
  city?: string;
  state?: string;
  postalCode?: string | null;
  country?: string | null;
  notes?: string | null;
  enabled?: boolean;
}

export class CustomerEntity {
  readonly id: string;
  readonly orgId: string;
  readonly userId: string | null;
  readonly originId: string | null;
  readonly createdBy: string | null;
  readonly name: string;
  readonly email: string;
  readonly phone: string | null;
  readonly birthDate: string;
  readonly gender: Gender | null;
  readonly address: string;
  readonly number: string | null;
  readonly addressLine2: string | null;
  readonly city: string | null;
  readonly state: string | null;
  readonly postalCode: string | null;
  readonly country: string | null;
  readonly notes: string | null;
  readonly enabled: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  private constructor(props: CustomerEntityProps) {
    this.id = props.id;
    this.orgId = props.orgId;
    this.userId = props.userId;
    this.originId = props.originId;
    this.createdBy = props.createdBy;
    this.name = props.name;
    this.email = props.email;
    this.phone = props.phone;
    this.birthDate = props.birthDate;
    this.gender = props.gender;
    this.address = props.address;
    this.number = props.number;
    this.addressLine2 = props.addressLine2;
    this.city = props.city;
    this.state = props.state;
    this.postalCode = props.postalCode;
    this.country = props.country;
    this.notes = props.notes;
    this.enabled = props.enabled;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  static create(props: CustomerEntityProps): CustomerEntity {
    return new CustomerEntity(props);
  }
}
