export const QUOTE_FORM_REPOSITORY = Symbol("QUOTE_FORM_REPOSITORY");

export type QuoteFormRecord = {
  slug: string;
  displayName: string;
  enabled: boolean;
};

export type UpsertQuoteFormData = {
  orgId: string;
  userId: string;
  slug: string;
  displayName: string;
  enabled: boolean;
};

export type PublicQuoteFormTarget = {
  formId: string;
  orgId: string;
  targetUserId: string;
  orgName: string;
  displayName: string;
};

export interface IQuoteFormRepository {
  // Via DRIZZLE (RLS): membership habilitada do usuario autenticado na org.
  findMemberContext(
    orgId: string,
    authId: string,
  ): Promise<{ userId: string } | null>;

  // Via DRIZZLE (RLS).
  findByOrgAndUser(
    orgId: string,
    userId: string,
  ): Promise<QuoteFormRecord | null>;

  // Via DRIZZLE (RLS). Lanca QuoteFormSlugUnavailableException em colisao de slug.
  upsertForMember(data: UpsertQuoteFormData): Promise<QuoteFormRecord>;

  // Via DRIZZLE_ADMIN (rota publica, sem sessao; excecao escopada ADR-0021/0035).
  // null quando o formulario esta desativado, o membro desabilitado ou a org suspensa.
  findPublicBySlugAsAdmin(slug: string): Promise<PublicQuoteFormTarget | null>;
}
