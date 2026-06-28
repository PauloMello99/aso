import type { IMemberRepository } from "../../../organizations/domain/member.repository.interface";
import { ServiceForbiddenException } from "../../domain/exceptions/service-forbidden.exception";

export interface ResolvedMembership {
  /** Id na tabela `users` (app), usado em performed_by / created_by. */
  userId: string;
  isOwner: boolean;
}

/**
 * Converte o auth id (Supabase) do usuário logado na associação da org —
 * devolve o `users.id` interno (para performed_by/created_by) e se é owner.
 * O `OrgMembershipGuard` já garante que existe associação ativa.
 */
export async function resolveMembership(
  memberRepo: IMemberRepository,
  orgId: string,
  authId: string,
): Promise<ResolvedMembership> {
  const member = await memberRepo.findByAuthId(orgId, authId);
  if (!member) throw new ServiceForbiddenException();
  return { userId: member.userId, isOwner: member.role === "owner" };
}
