import type { QuoteRequestViewerScope } from "./quote-request-viewer-scope";

export const QUOTE_REQUEST_REPOSITORY = Symbol("QUOTE_REQUEST_REPOSITORY");

export type CreateQuoteRequestData = {
  id: string;
  orgId: string;
  targetUserId: string;
  requesterName: string;
  requesterPhone: string;
  requesterEmail: string;
  idea: string;
  consentVersion: string;
  consentTextSnapshot: string;
  privacyConsentAcceptedAt: Date;
  contactRetentionConsentAcceptedAt: Date | null;
  createdAt: Date;
  expiresAt: Date;
};

export type CreateQuoteRequestImageData = {
  storagePath: string;
  contentType: string;
  sizeBytes: number;
  position: number;
};

export type QuoteRequestListItem = {
  id: string;
  targetUserId: string;
  targetDisplayName: string | null;
  requesterName: string;
  idea: string;
  status: string;
  viewedAt: Date | null;
  createdAt: Date;
  expiresAt: Date;
  imageCount: number;
};

export type ListQuoteRequestsQuery = {
  limit: number;
  offset: number;
  unreadOnly: boolean;
};

export type QuoteRequestListPage = {
  items: QuoteRequestListItem[];
  total: number;
};

export type QuoteRequestImageRecord = {
  id: string;
  storagePath: string;
  contentType: string;
  sizeBytes: number;
  position: number;
};

export type QuoteRequestDetail = {
  id: string;
  targetUserId: string;
  targetDisplayName: string | null;
  requesterName: string;
  requesterPhone: string;
  requesterEmail: string;
  idea: string;
  status: string;
  viewedAt: Date | null;
  createdAt: Date;
  expiresAt: Date;
  contactRetentionConsentAcceptedAt: Date | null;
  images: QuoteRequestImageRecord[];
};

export interface IQuoteRequestRepository {
  // Via DRIZZLE_ADMIN (rota publica, sem sessao): INSERT do pedido + imagens, atomico.
  createWithImagesAsAdmin(
    request: CreateQuoteRequestData,
    images: CreateQuoteRequestImageData[],
  ): Promise<void>;

  // Via DRIZZLE (sessao/RLS, 0089). Mais recentes primeiro.
  listForViewer(
    orgId: string,
    scope: QuoteRequestViewerScope,
    query: ListQuoteRequestsQuery,
  ): Promise<QuoteRequestListPage>;

  // Via DRIZZLE (sessao/RLS). Pedidos ainda nao vistos (viewed_at nulo).
  countUnreadForViewer(
    orgId: string,
    scope: QuoteRequestViewerScope,
  ): Promise<number>;

  // Via DRIZZLE (sessao/RLS). null quando inexistente ou fora do escopo.
  findDetailForViewer(
    orgId: string,
    scope: QuoteRequestViewerScope,
    id: string,
  ): Promise<QuoteRequestDetail | null>;

  // Via DRIZZLE (sessao/RLS). Idempotente: so seta viewed_at se ainda nulo, e e a
  // unica coluna que o tenant pode alterar (0089).
  markViewed(
    orgId: string,
    scope: QuoteRequestViewerScope,
    id: string,
    viewedAt: Date,
  ): Promise<void>;
}
