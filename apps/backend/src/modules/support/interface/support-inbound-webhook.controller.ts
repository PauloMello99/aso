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
import {
  IInboundEmailClient,
  INBOUND_EMAIL_CLIENT,
  InboundEmailEvent,
} from "../domain/ports/inbound-email.port";
import { HandleInboundEmailUseCase } from "../application/use-cases/handle-inbound-email.use-case";

/**
 * Webhook de e-mail recebido pela Resend (Svix). Autenticação é via
 * assinatura HMAC do payload (`svix-*`), não sessão — por isso não tem
 * `AuthGuard`. Falha real de processamento (qualquer exceção lançada por
 * `HandleInboundEmailUseCase.execute`) DEVE propagar sem catch: um retorno
 * não-2xx faz a Resend reencaminhar o webhook depois; capturar aqui e
 * devolver 200 mesmo assim reintroduziria, do lado de fora, o mesmo bug de
 * perda silenciosa que a correção de atomicidade do use-case resolveu por
 * dentro.
 */
@Controller("webhooks/support-inbound")
@SkipThrottle()
export class SupportInboundWebhookController {
  private readonly logger = new Logger(SupportInboundWebhookController.name);

  constructor(
    @Inject(INBOUND_EMAIL_CLIENT)
    private readonly emailClient: IInboundEmailClient,
    private readonly handleInboundEmail: HandleInboundEmailUseCase,
  ) {}

  @Post()
  @HttpCode(200)
  async handle(
    @Req() req: RawBodyRequest<Request>,
    @Headers("svix-id") svixId: string | undefined,
    @Headers("svix-timestamp") svixTimestamp: string | undefined,
    @Headers("svix-signature") svixSignature: string | undefined,
  ): Promise<{ received: boolean; ignored?: boolean; claimed?: boolean }> {
    if (!req.rawBody || !svixId || !svixTimestamp || !svixSignature) {
      throw new UnauthorizedException(
        "Webhook Resend sem corpo bruto ou cabeçalhos de assinatura",
      );
    }

    let event: InboundEmailEvent;
    try {
      event = this.emailClient.verifyWebhook(req.rawBody, {
        id: svixId,
        timestamp: svixTimestamp,
        signature: svixSignature,
      });
    } catch (error) {
      // Loga a causa (inclui o caso de configuração ausente, ex.:
      // RESEND_WEBHOOK_SECRET não setado) antes de responder 401 — sem isso,
      // um erro de configuração vira 401 indistinguível de ataque para
      // TODA entrega, e a Resend acaba desistindo de reenviar.
      this.logger.warn(
        `Falha ao verificar assinatura do webhook Resend: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw new UnauthorizedException("Assinatura de webhook Resend inválida");
    }

    if (event.type !== "email.received") {
      this.logger.debug(`Evento Resend ignorado: type=${event.type}`);
      return { received: true, ignored: true };
    }

    if (!event.emailId) {
      // Evento email.received sem emailId nunca teria sucesso num retry —
      // não é falha de infra (500 faria a Resend reenviar para sempre),
      // então ignoramos com 200 e só logamos o tipo (sem from/subject).
      this.logger.warn(
        `Evento email.received sem emailId: type=${event.type}`,
      );
      return { received: true, ignored: true };
    }

    // Sem try/catch de propósito: falha real de infraestrutura deve
    // propagar (500 via filtro global) para que a Resend reenvie.
    // `messageId` (Message-ID RFC 5322) não é exposto por IInboundEmailClient
    // hoje (nem verifyWebhook nem getReceivedEmail o retornam) — passar
    // svix-id inventaria semântica errada na coluna, então usamos `null`
    // (coluna já é nullable; ver deviations_from_plan).
    const result = await this.handleInboundEmail.execute(event.emailId, null);

    return { received: true, claimed: result.claimed };
  }
}
