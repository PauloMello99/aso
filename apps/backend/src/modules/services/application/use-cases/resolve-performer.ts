import type { IMemberRepository } from "../../../organizations/domain/member.repository.interface";
import { EmployeeInactiveException } from "../../domain/exceptions/employee-inactive.exception";

export async function resolvePerformer(
  memberRepo: IMemberRepository,
  orgId: string,
  currentUserId: string,
  isOwner: boolean,
  requestedPerformerId?: string | null,
): Promise<string> {
  if (!isOwner) return currentUserId;

  const performerId = requestedPerformerId ?? currentUserId;
  if (performerId === currentUserId) return performerId;

  const members = await memberRepo.findAllByOrg(orgId);
  const member = members.find((m) => m.userId === performerId && m.enabled);
  if (!member) throw new EmployeeInactiveException(performerId);

  return performerId;
}
