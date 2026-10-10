// Quem pode ver quais pedidos: owner (e super_admin agindo como owner, ADR-0013)
// ve todos da org; funcionario so os enderecados a ele (target_user_id). O RLS
// (0089) impoe o mesmo recorte no banco; este escopo e o filtro explicito do app.
export type QuoteRequestViewerScope =
  | { kind: "all" }
  | { kind: "own"; userId: string };

export interface ResolveQuoteRequestViewerScopeInput {
  // true para role owner OU super_admin.
  isOwner: boolean;
  // users.id da membership habilitada do chamador; null quando nao ha (ex.: super_admin).
  memberUserId: string | null;
}

// null = sem escopo possivel (funcionario sem membership): nao ve nada.
export function resolveQuoteRequestViewerScope(
  input: ResolveQuoteRequestViewerScopeInput,
): QuoteRequestViewerScope | null {
  if (input.isOwner) return { kind: "all" };
  if (input.memberUserId === null) return null;
  return { kind: "own", userId: input.memberUserId };
}
