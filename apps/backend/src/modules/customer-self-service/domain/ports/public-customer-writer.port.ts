import type {
  CreateCustomerData,
  CustomerEntity,
  UpdateCustomerData,
} from "../../../customers/domain/customer.entity";

export const PUBLIC_CUSTOMER_WRITER = Symbol("PUBLIC_CUSTOMER_WRITER");

/**
 * Subconjunto EXPLÍCITO (whitelist) de `UpdateCustomerData` que os caminhos públicos
 * de auto-cadastro/atualização (sem sessão autenticada) podem alterar. Campos como
 * `enabled`, `notes` e `originId` são deliberadamente omitidos — o público nunca deve
 * poder tocá-los.
 */
export type PublicCustomerCoreUpdate = Pick<
  UpdateCustomerData,
  | "name"
  | "email"
  | "phone"
  | "birthDate"
  | "gender"
  | "address"
  | "number"
  | "addressLine2"
  | "city"
  | "state"
  | "postalCode"
  | "country"
>;

/**
 * Mesma whitelist de `PublicCustomerCoreUpdate`, aplicada ao create. `orgId`,
 * `createdBy`, `originId` e `notes` NUNCA vêm do público — são preenchidos pelo
 * writer (orgId como parâmetro explícito de `createForOrg`, os demais hardcoded).
 */
export type PublicCustomerCoreCreate = Pick<
  CreateCustomerData,
  | "name"
  | "email"
  | "phone"
  | "birthDate"
  | "gender"
  | "address"
  | "number"
  | "addressLine2"
  | "city"
  | "state"
  | "postalCode"
  | "country"
>;

/**
 * Port de escrita em `customers` para os caminhos PÚBLICOS (sem sessão autenticada,
 * sem claims JWT) de auto-cadastro/atualização de cliente via link público. Não deve
 * ser usado por nenhum caminho autenticado — para esses, use `ICustomerRepository`
 * (`apps/backend/src/modules/customers/domain/customer.repository.interface.ts`).
 */
export interface IPublicCustomerWriter {
  /**
   * Retorno estreitado a `{ id }` — usado só para checar duplicidade de e-mail,
   * não deve vazar PII (telefone, endereço, data de nascimento, notes).
   */
  findByEmailInOrg(
    orgId: string,
    email: string,
    excludeId?: string,
  ): Promise<{ id: string } | null>;

  findByIdInOrg(id: string, orgId: string): Promise<CustomerEntity | null>;

  createForOrg(
    orgId: string,
    data: PublicCustomerCoreCreate,
  ): Promise<CustomerEntity>;

  /**
   * Retorna `null` quando `id`/`orgId` não casam com nenhuma linha (ex.: id não
   * pertence à org) — cabe ao use-case decidir a exceção de domínio.
   */
  updateCoreFields(
    id: string,
    orgId: string,
    data: PublicCustomerCoreUpdate,
  ): Promise<CustomerEntity | null>;
}
