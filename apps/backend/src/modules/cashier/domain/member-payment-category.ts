import { ITransactionCategoryRepository } from "./transaction-category.repository.interface";
import { MemberPaymentCategoryNotFoundException } from "./exceptions/member-payment-category-not-found.exception";

export const MEMBER_PAYMENT_CATEGORY_KEY = "member_payment";

// NAO seguir o padrao de reversal-category.ts (retorna null silenciosamente
// se a categoria nao existir) — marcado como ERRADO para este caso pelo
// database-guardian. org_member_payments/transactions sao append-only: um
// pagamento nascido com categoria nula e incorrigivel depois, entao aqui
// FALHA com DomainException em vez de propagar null para o caller.
export async function resolveMemberPaymentCategoryId(
  repo: ITransactionCategoryRepository,
  orgId: string,
): Promise<string> {
  const category = await repo.findBySystemKey(orgId, MEMBER_PAYMENT_CATEGORY_KEY);
  if (!category) throw new MemberPaymentCategoryNotFoundException(orgId);
  return category.id;
}
