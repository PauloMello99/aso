import type { IMemberRepository } from "../../../organizations/domain/member.repository.interface";
import { CashierForbiddenException } from "../../domain/exceptions/cashier-forbidden.exception";

export interface ResolvedActor {
  /** users.id (app) do usuário logado — usado em created_by. */
  userId: string;
  isOwner: boolean;
}

/**
 * Converte o auth id (Supabase) na associação da org → { userId (app), isOwner }.
 * O `OrgMembershipGuard` já garante associação ativa; aqui resolvemos o papel.
 */
export async function resolveActor(
  memberRepo: IMemberRepository,
  orgId: string,
  authId: string,
): Promise<ResolvedActor> {
  const member = await memberRepo.findByAuthId(orgId, authId);
  if (!member) throw new CashierForbiddenException();
  return { userId: member.userId, isOwner: member.role === "owner" };
}

/**
 * Decide o `created_by` de um lançamento no caixa.
 * - **Funcionário**: força sempre o próprio usuário (não lança em nome de outro).
 * - **Owner**: pode atribuir a qualquer membro **ativo**; default = ele mesmo.
 */
export async function resolveCreatedBy(
  memberRepo: IMemberRepository,
  orgId: string,
  currentUserId: string,
  isOwner: boolean,
  requestedUserId?: string | null,
): Promise<string> {
  if (!isOwner) return currentUserId;

  const target = requestedUserId ?? currentUserId;
  if (target === currentUserId) return target;

  const members = await memberRepo.findAllByOrg(orgId);
  const member = members.find((m) => m.userId === target && m.enabled);
  if (!member) throw new CashierForbiddenException();

  return target;
}
