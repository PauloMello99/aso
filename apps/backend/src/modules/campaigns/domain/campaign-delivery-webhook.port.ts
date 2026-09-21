export const CAMPAIGN_DELIVERY_WEBHOOK_CLIENT = Symbol(
  "CAMPAIGN_DELIVERY_WEBHOOK_CLIENT",
);

/**
 * Cabeçalhos Svix enviados pela Resend em todo webhook (`svix-id`,
 * `svix-timestamp`, `svix-signature` — os que o controller lê), usados para verificar a
 * assinatura HMAC do payload — mesmo formato do webhook de inbound do
 * support (`InboundWebhookHeaders`).
 */
export interface CampaignDeliveryWebhookHeaders {
  id: string;
  timestamp: string;
  signature: string;
}

/**
 * Evento de webhook de entrega já com assinatura verificada. `type` é o tipo
 * bruto do evento Resend (ex.: "email.bounced", "email.delivered",
 * "email.sent", ou até tipos sem e-mail associado como "domain.created") — o
 * `HandleCampaignBounceUseCase` e o controller do próximo passo decidem o que
 * fazer com cada tipo; este client nunca lança por causa do tipo, só por
 * assinatura inválida/ausente.
 *
 * `tags` é a correlação com `campaign_sends` (tag `campaign_send_id` ecoada
 * pelo Resend em todo evento `email.*`, D-4.2) — vem `{}` quando o evento não
 * tem tags ou não é um evento `email.*`.
 *
 * `bounceType`/`bounceSubType`/`bounceMessage` só vêm preenchidos quando
 * `type === "email.bounced"`; `null` em qualquer outro tipo.
 */
export interface CampaignDeliveryEvent {
  type: string;
  emailId: string | null;
  tags: Record<string, string>;
  bounceType: string | null;
  bounceSubType: string | null;
  bounceMessage: string | null;
}

export interface ICampaignDeliveryWebhookClient {
  /** Lança em assinatura inválida/ausente ou payload malformado. */
  verifyWebhook(
    rawBody: Buffer,
    headers: CampaignDeliveryWebhookHeaders,
  ): CampaignDeliveryEvent;
}
