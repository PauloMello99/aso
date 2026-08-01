import type { TransactionCategoryEntity } from "./transaction-category.entity";

export const TRANSACTION_CATEGORY_REPOSITORY = Symbol(
  "TRANSACTION_CATEGORY_REPOSITORY",
);

export interface ITransactionCategoryRepository {
  findByOrg(orgId: string): Promise<TransactionCategoryEntity[]>;
  findById(id: string, orgId: string): Promise<TransactionCategoryEntity | null>;
  findBySystemKey(
    orgId: string,
    systemKey: string,
  ): Promise<TransactionCategoryEntity | null>;
  create(orgId: string, name: string): Promise<TransactionCategoryEntity>;
  update(
    id: string,
    orgId: string,
    name: string,
  ): Promise<TransactionCategoryEntity>;
  delete(id: string, orgId: string): Promise<void>;
}
