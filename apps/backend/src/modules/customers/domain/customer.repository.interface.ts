import {
  CreateCustomerData,
  CustomerEntity,
  UpdateCustomerData,
} from "./customer.entity";

export const CUSTOMER_REPOSITORY = Symbol("CUSTOMER_REPOSITORY");

export interface ListCustomersFilter {
  /** Case-insensitive match against name / email / phone */
  search?: string;
  /** When true, only enabled (active) customers are returned */
  enabledOnly?: boolean;
  /** Filtra por origem do cliente. */
  originId?: string;
  /** Filtra por gênero. */
  gender?: "male" | "female" | "other";
  /** Filtra por status (ativo/inativo); ignora enabledOnly quando definido. */
  status?: "active" | "inactive";
  /** Faixa de data de cadastro: início inclusivo. */
  from?: Date;
  /** Faixa de data de cadastro: fim inclusivo. */
  to?: Date;
  /** Mês de nascimento (1-12), ignora ano/dia; independente de from/to (que são data de cadastro). */
  birthMonth?: number;
  /** Match exato de cidade. */
  city?: string;
  /** Match exato de estado. */
  state?: string;
}

export interface ICustomerRepository {
  findById(id: string, orgId: string): Promise<CustomerEntity | null>;
  findByEmail(
    orgId: string,
    email: string,
    excludeId?: string,
  ): Promise<CustomerEntity | null>;
  findAllByOrg(
    orgId: string,
    filter?: ListCustomersFilter,
  ): Promise<CustomerEntity[]>;
  create(data: CreateCustomerData): Promise<CustomerEntity>;
  update(id: string, data: UpdateCustomerData): Promise<CustomerEntity>;
  delete(id: string, orgId: string): Promise<void>;
}
