import type { IMemberRepository } from "../../../organizations/domain/member.repository.interface";
import { QuoteRequestNotFoundException } from "../../domain/exceptions/quote-request-not-found.exception";
import {
  QuoteRequestViewerScope,
  resolveQuoteRequestViewerScope,
} from "../../domain/quote-request-viewer-scope";

// Escopo do leitor derivado da sessao (org do path + authId), nunca do cliente.
// findByAuthId sintetiza o super_admin como owner (ADR-0013). Sem membership
// habilitada: 404 (indistinguivel de "pedido inexistente").
export async function resolveViewerScope(
  memberRepo: IMemberRepository,
  orgId: string,
  authId: string,
): Promise<QuoteRequestViewerScope> {
  const member = await memberRepo.findByAuthId(orgId, authId);
  if (!member || !member.enabled) throw new QuoteRequestNotFoundException();
  const scope = resolveQuoteRequestViewerScope({
    isOwner: member.role === "owner",
    memberUserId: member.userId,
  });
  if (!scope) throw new QuoteRequestNotFoundException();
  return scope;
}
