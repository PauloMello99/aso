export const INBOUND_EMAIL_CLIENT = Symbol("INBOUND_EMAIL_CLIENT");

/**
 * Cabeçalhos Svix enviados pela Resend em todo webhook (`webhook-id`,
 * `webhook-timestamp`, `webhook-signature`), usados para verificar a
 * assinatura HMAC do payload.
 */
export interface InboundWebhookHeaders {
  id: string;
  timestamp: string;
  signature: string;
}

/**
 * Evento de webhook já com assinatura verificada. `type` é o tipo bruto do
 * evento Resend (ex.: "email.received", "email.bounced", "domain.created").
 * O controller do próximo passo deve tratar apenas `type === "email.received"`
 * e ignorar (200 sem processar) qualquer outro tipo — este client nunca
 * lança por causa do tipo, só por assinatura inválida/ausente.
 * Para tipos de evento sem e-mail associado (ex.: contact.*, domain.*),
 * `emailId`/`from`/`subject` vêm `null` e `to` vem vazio.
 */
export interface InboundEmailEvent {
  type: string;
  emailId: string | null;
  from: string | null;
  to: string[];
  subject: string | null;
}

export interface InboundEmailBody {
  text: string | null;
  html: string | null;
  from: string;
  to: string[];
  subject: string;
}

export interface InboundEmailAttachmentRef {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  /** URL assinada e temporária — nunca logar. */
  downloadUrl: string;
}

export interface IInboundEmailClient {
  /** Lança em assinatura inválida/ausente ou payload malformado. */
  verifyWebhook(
    rawBody: Buffer,
    headers: InboundWebhookHeaders,
  ): InboundEmailEvent;
  getReceivedEmail(emailId: string): Promise<InboundEmailBody>;
  /** Nunca lança — falha na listagem retorna array vazio (loga warn). */
  listAttachments(emailId: string): Promise<InboundEmailAttachmentRef[]>;
  /** Lança se o download falhar ou exceder o limite de tamanho. */
  downloadAttachment(ref: InboundEmailAttachmentRef): Promise<Buffer>;
}
