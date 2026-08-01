import { ITransactionCategoryRepository } from "./transaction-category.repository.interface";

export const REVERSAL_CATEGORY_KEY = "reversal";

export async function resolveReversalCategoryId(
  repo: ITransactionCategoryRepository,
  orgId: string,
): Promise<string | null> {
  const c = await repo.findBySystemKey(orgId, REVERSAL_CATEGORY_KEY);
  return c?.id ?? null;
}
