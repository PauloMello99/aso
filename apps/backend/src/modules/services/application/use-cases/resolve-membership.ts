import type { IMemberRepository } from "../../../organizations/domain/member.repository.interface";
import { ServiceForbiddenException } from "../../domain/exceptions/service-forbidden.exception";

export interface ResolvedMembership {
  userId: string;
  isOwner: boolean;
}

export async function resolveMembership(
  memberRepo: IMemberRepository,
  orgId: string,
  authId: string,
): Promise<ResolvedMembership> {
  const member = await memberRepo.findByAuthId(orgId, authId);
  if (!member) throw new ServiceForbiddenException();
  return { userId: member.userId, isOwner: member.role === "owner" };
}
