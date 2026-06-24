import type { TransactionCategoryEntity } from "./transaction-category.entity";

export const TRANSACTION_CATEGORY_REPOSITORY = Symbol(
  "TRANSACTION_CATEGORY_REPOSITORY",
);

export interface ITransactionCategoryRepository {
  findByOrg(orgId: string): Promise<TransactionCategoryEntity[]>;
  findById(id: string, orgId: string): Promise<TransactionCategoryEntity | null>;
  /** Cria (ou retorna a existente, por UNIQUE org+name). */
  create(orgId: string, name: string): Promise<TransactionCategoryEntity>;
}
