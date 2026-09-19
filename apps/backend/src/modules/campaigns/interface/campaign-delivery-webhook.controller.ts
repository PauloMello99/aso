import {
  Controller,
  Headers,
  HttpCode,
  Inject,
  Logger,
  Post,
  Req,
  UnauthorizedException,
  type RawBodyRequest,
} from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import type { Request } from "express";
import { HandleCampaignBounceUseCase } from "../application/use-cases/handle-campaign-bounce.use-case";
import {
  CAMPAIGN_DELIVERY_WEBHOOK_CLIENT,
  CampaignDeliveryEvent,
  ICampaignDeliveryWebhookClient,
} from "../domain/campaign-delivery-webhook.port";

/**
 * Webhook de ENTREGA de e-mail da Resend (Svix) — bounce/delivered/sent/etc.
 * Mesmo padrão de autenticação do webhook de inbound do support
 * (`SupportInboundWebhookController`): assinatura HMAC do payload
 * (`svix-*`), não sessão, por isso sem `AuthGuard`.
 *
 * Este endpoint recebe TODO evento `email.*` da conta Resend inteira — não
 * só de campanha (convite, reset de senha, notificações, welcome também
 * passam por aqui). Só processa `email.bounced` (filtro POSITIVO: só o tipo
 * que conhece, não uma lista de exclusão); qualquer outro tipo é ignorado
 * com 200.
 *
 * INVERSÃO DELIBERADA em relação ao `SupportInboundWebhookController`: lá,
 * uma falha real do use-case propaga como 5xx para a Resend reenviar. AQUI,
 * quando `HandleCampaignBounceUseCase.execute` retorna `handled: false`
 * (tag `campaign_send_id` ausente ou linha `sent` não encontrada), a
 * resposta é 200 mesmo assim — porque a MAIORIA dos eventos `email.bounced`
 * que chegam neste endpoint são de e-mails transacionais (sem a tag) e
 * `not_found`/`no_tag` são desfechos ESPERADOS, não uma falha de infra. Se
 * respondêssemos 5xx para `handled: false`, a Resend reentregaria o mesmo
 * evento indefinidamente até desabilitar o endpoint. Só uma exceção REAL
 * lançada por `execute` (ex.: falha do INSERT) deve propagar sem catch, para
 * a Resend reenviar — por isso não há try/catch em volta da chamada.
 */
@Controller("webhooks/campaign-delivery")
@SkipThrottle()
export class CampaignDeliveryWebhookController {
  private readonly logger = new Logger(CampaignDeliveryWebhookController.name);

  constructor(
    @Inject(CAMPAIGN_DELIVERY_WEBHOOK_CLIENT)
    private readonly deliveryClient: ICampaignDeliveryWebhookClient,
    private readonly handleCampaignBounce: HandleCampaignBounceUseCase,
  ) {}

  @Post()
  @HttpCode(200)
  async handle(
    @Req() req: RawBodyRequest<Request>,
    @Headers("svix-id") svixId: string | undefined,
    @Headers("svix-timestamp") svixTimestamp: string | undefined,
    @Headers("svix-signature") svixSignature: string | undefined,
  ): Promise<{ received: boolean; ignored?: boolean; handled?: boolean }> {
    if (!req.rawBody || !svixId || !svixTimestamp || !svixSignature) {
      throw new UnauthorizedException(
        "Webhook de entrega Resend sem corpo bruto ou cabeçalhos de assinatura",
      );
    }

    let event: CampaignDeliveryEvent;
    try {
      event = this.deliveryClient.verifyWebhook(req.rawBody, {
        id: svixId,
        timestamp: svixTimestamp,
        signature: svixSignature,
      });
    } catch (error) {
      // Loga a causa (inclui segredo ausente, ex.:
      // RESEND_DELIVERY_WEBHOOK_SECRET não setado) antes de responder 401 —
      // sem isso, um erro de configuração vira 401 indistinguível de ataque
      // para TODA entrega, e a Resend acaba desistindo de reenviar.
      this.logger.warn(
        `Falha ao verificar assinatura do webhook de entrega Resend: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw new UnauthorizedException(
        "Assinatura de webhook de entrega Resend inválida",
      );
    }

    if (event.type !== "email.bounced") {
      this.logger.debug(
        `Evento de entrega Resend ignorado: type=${event.type}`,
      );
      return { received: true, ignored: true };
    }

    // Sem try/catch de propósito: falha real de infraestrutura deve
    // propagar (500 via filtro global) para que a Resend reenvie. Só o
    // resultado `handled: false` (desfecho esperado, não erro) é tratado
    // abaixo com 200 — ver INVERSÃO DELIBERADA no comentário da classe.
    const result = await this.handleCampaignBounce.execute(event);

    if (!result.handled) {
      // `no_tag` é o caso MAJORITÁRIO (bounce de e-mail transacional da conta,
      // sem tag de campanha) — debug para não afogar o WARN que importa:
      // `not_found` (tag presente mas sem linha `sent`, ex.: corrida
      // bounce-antes-do-commit), sinal de reconciliação manual.
      if (result.reason === "no_tag") {
        this.logger.debug("Bounce Resend sem tag de campanha — ignorado.");
      } else {
        this.logger.warn(
          `Bounce de entrega Resend não processado: reason=${result.reason}`,
        );
      }
      return { received: true, handled: false };
    }

    return { received: true, handled: true };
  }
}
