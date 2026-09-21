import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Resend } from "resend";
import type { WebhookEventPayload } from "resend";
import type {
  CampaignDeliveryEvent,
  CampaignDeliveryWebhookHeaders,
  ICampaignDeliveryWebhookClient,
} from "../domain/campaign-delivery-webhook.port";

/**
 * Subconjunto de `BaseEmailEventData` (tipo interno do SDK, não exportado —
 * só os eventos concretos como `EmailBouncedEvent` são) que este client
 * precisa: `email_id` existe em TODA variante `email.*` (inclusive
 * `email.received`, que usa `ReceivedEmailEventData`); `tags` só existe nas
 * variantes que passam por `BaseEmailEventData` — por isso opcional aqui, com
 * fallback `?? {}` na leitura.
 */
interface EmailEventDataShape {
  email_id: string;
  tags?: Record<string, string>;
}

/**
 * Verificação de assinatura do webhook de ENTREGA da Resend (bounce/delivered/
 * etc.), segredo `RESEND_DELIVERY_WEBHOOK_SECRET` (CP-2 do plano — separado do
 * `RESEND_WEBHOOK_SECRET` do webhook de inbound do support, senão todo bounce
 * daria 401).
 *
 * DECISÃO DELIBERADA DO PLANO (Bloco 4, D-4.2): estas ~30 linhas duplicam
 * `ResendInboundEmailClient.verifyWebhook` (mesmo SDK/mecanismo de
 * verificação HMAC) em vez de reaproveitar via import/herança. Módulos
 * diferentes em Clean Architecture, contratos de retorno divergentes
 * (`InboundEmailEvent` vs `CampaignDeliveryEvent`) — a duplicação é aceita
 * conscientemente em vez de criar um acoplamento novo entre `support` e
 * `campaigns` só para compartilhar um parser de webhook.
 */
@Injectable()
export class ResendCampaignDeliveryWebhookClient
  implements ICampaignDeliveryWebhookClient
{
  private readonly client: Resend;
  private readonly webhookSecret: string;

  constructor(config: ConfigService) {
    const apiKey = config.get<string>("RESEND_API_KEY") ?? "";
    // `webhooks.verify()` é puramente local (HMAC via standardwebhooks) e não
    // depende de uma key real — mesmo placeholder do client de inbound.
    this.client = new Resend(apiKey || "re_disabled_missing_RESEND_API_KEY");
    this.webhookSecret =
      config.get<string>("RESEND_DELIVERY_WEBHOOK_SECRET") ?? "";
  }

  verifyWebhook(
    rawBody: Buffer,
    headers: CampaignDeliveryWebhookHeaders,
  ): CampaignDeliveryEvent {
    if (!this.webhookSecret) {
      // Sem "modo dev sem verificação": um webhook não verificado autoriza
      // escrita (linha `bounced` + audit log), então SEMPRE lança — nenhum
      // bypass em nenhum ambiente (CP-2).
      throw new Error(
        "RESEND_DELIVERY_WEBHOOK_SECRET ausente — não é possível verificar o webhook de entrega Resend",
      );
    }

    let payload: WebhookEventPayload;
    try {
      payload = this.client.webhooks.verify({
        payload: rawBody.toString("utf8"),
        headers: {
          id: headers.id,
          timestamp: headers.timestamp,
          signature: headers.signature,
        },
        webhookSecret: this.webhookSecret,
      });
    } catch (error) {
      throw new Error(
        `Assinatura de webhook de entrega Resend inválida: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    if (!payload.type.startsWith("email.")) {
      return {
        type: payload.type,
        emailId: null,
        tags: {},
        bounceType: null,
        bounceSubType: null,
        bounceMessage: null,
      };
    }

    // Todas as variantes "email.*" compartilham email_id em `data`; mesmo
    // padrão de cast do client de inbound do support (union sem narrowing por
    // `startsWith`) — `tags` é lido com fallback abaixo, ver `EmailEventDataShape`.
    const data = payload.data as unknown as EmailEventDataShape;

    if (payload.type === "email.bounced") {
      // `payload.type === "email.bounced"` estreita `payload` para
      // `EmailBouncedEvent` (union discriminada por `type`), então
      // `payload.data.bounce` já vem tipado — sem cast.
      const bounce = payload.data.bounce;
      return {
        type: payload.type,
        emailId: data.email_id,
        tags: data.tags ?? {},
        bounceType: bounce.type,
        bounceSubType: bounce.subType,
        bounceMessage: bounce.message,
      };
    }

    return {
      type: payload.type,
      emailId: data.email_id,
      tags: data.tags ?? {},
      bounceType: null,
      bounceSubType: null,
      bounceMessage: null,
    };
  }
}
