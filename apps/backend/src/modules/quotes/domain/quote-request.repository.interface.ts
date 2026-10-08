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

export interface IQuoteRequestRepository {
  // Via DRIZZLE_ADMIN (rota publica, sem sessao): INSERT do pedido + imagens, atomico.
  createWithImagesAsAdmin(
    request: CreateQuoteRequestData,
    images: CreateQuoteRequestImageData[],
  ): Promise<void>;
}
