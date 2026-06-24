import type { IMemberRepository } from "../../../organizations/domain/member.repository.interface";
import { EmployeeInactiveException } from "../../domain/exceptions/employee-inactive.exception";

/**
 * Decide quem é o profissional (`performed_by`, auth id) de um serviço.
 *
 * - **Funcionário** (não-owner): força sempre o próprio usuário logado — não
 *   pode lançar em nome de outro (reunião 11/06).
 * - **Owner**: pode escolher qualquer profissional; default = ele mesmo. O
 *   escolhido precisa ser **membro ativo** da org.
 */
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
