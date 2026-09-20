import { Inject, Injectable } from "@nestjs/common";
import { AuditService } from "../../../audit/audit.service";
import type { CampaignDeliveryEvent } from "../../domain/campaign-delivery-webhook.port";
import {
  CAMPAIGN_SEND_REPOSITORY,
  ICampaignSendRepository,
} from "../../domain/campaign-send.repository.interface";
import { isUuid } from "../../domain/is-uuid";
import { redactEmail } from "../../domain/redact-email";

export interface HandleCampaignBounceResult {
  handled: boolean;
  reason?: "no_tag" | "not_found";
}

/**
 * Monta um texto de motivo legível a partir do bounce reportado pela Resend.
 * `redactEmail` aplicado ANTES de persistir — `bounceMessage` do provedor
 * costuma ecoar o endereço do destinatário (PII) e a coluna
 * `campaign_sends.error` é exposta ao dono da org no relatório de entrega
 * (ver `redact-email.ts`).
 * Retorna `null` quando não há nada a dizer (os três campos vieram vazios).
 */
function buildBounceReason(event: CampaignDeliveryEvent): string | null {
  const label = [event.bounceType, event.bounceSubType]
    .filter((part): part is string => Boolean(part))
    .join("/");
  const message = event.bounceMessage ?? "";
  const combined = [label, message].filter((part) => part.length > 0).join(": ");
  return combined.length > 0 ? redactEmail(combined) : null;
}

/**
 * Processa UM evento de webhook de entrega já com assinatura verificada
 * (verificação em si é o client, controller é o passo 8). Correlação
 * envio↔bounce é via tag `campaign_send_id` (D-4.2) — nunca por coluna nova.
 *
 * Dois caminhos "nada a fazer", NÃO erro (retornam sem escrever nada):
 *   - tag ausente/vazia: evento não é de campanha (e-mail transacional ou de
 *     outro produto na mesma conta Resend) — esperado, não patológico.
 *   - `findSentById` não encontra: a linha `sent` nunca existiu com esse id
 *     (tag adulterada/desconhecida) ou a corrida "bounce antes do commit" (ver
 *     riscos do plano) — mitigado por reconciliação manual, não por erro aqui.
 *
 * NÃO faz dedupe próprio: reentrega do mesmo evento pelo Resend chama
 * `recordBounce` de novo — a idempotência vem de graça da unique
 * `(dedupe_key, attempt, status)` já existente em `campaign_sends`
 * (`ON CONFLICT DO NOTHING` dentro do repositório). `recordBounce` devolve
 * `false` na reentrega e o audit log só é gravado quando inseriu.
 *
 * NÃO checa `event.type === "email.bounced"` — é responsabilidade do
 * controller (passo 8) só chamar este use-case para esse tipo; um evento de
 * outro tipo carregando a tag por engano gravaria um bounce indevido.
 */
@Injectable()
export class HandleCampaignBounceUseCase {
  constructor(
    @Inject(CAMPAIGN_SEND_REPOSITORY)
    private readonly sendRepo: ICampaignSendRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    event: CampaignDeliveryEvent,
  ): Promise<HandleCampaignBounceResult> {
    const sendId = event.tags["campaign_send_id"];
    if (!sendId) {
      return { handled: false, reason: "no_tag" };
    }

    // Tag assinada mas não-UUID (adulterada/de outro produto): a coluna `id` é
    // uuid e o cast do Postgres lançaria 500 — a Resend reentregaria para
    // sempre. Trata como qualquer outra tag desconhecida (200).
    if (!isUuid(sendId)) {
      return { handled: false, reason: "not_found" };
    }

    const sent = await this.sendRepo.findSentById(sendId);
    if (!sent) {
      return { handled: false, reason: "not_found" };
    }

    const reason = buildBounceReason(event);

    const inserted = await this.sendRepo.recordBounce({
      sentRowId: sendId,
      orgId: sent.orgId,
      customerId: sent.customerId,
      trigger: sent.trigger,
      dedupeKey: sent.dedupeKey,
      attempt: sent.attempt,
      sentAt: sent.sentAt,
      reason,
    });

    // Reentrega (recordBounce -> false): a linha não duplicou, então o audit
    // também não — segue 200 com handled:true.
    if (!inserted) {
      return { handled: true };
    }

    // actorId null: evento vem do webhook do provedor, não de um usuário
    // autenticado — mesmo molde de audit "sistema" já usado no módulo.
    // metadata SEM bounceMessage/reason (podem carregar PII antes de
    // redigidos em cenários futuros de bounceType não mapeado) — só os
    // campos estruturados já usados para correlação/depuração.
    await this.auditService.log({
      actorId: null,
      orgId: sent.orgId,
      action: "campaign_email_bounced",
      entityType: "campaign_send",
      entityId: sendId,
      metadata: {
        trigger: sent.trigger,
        attempt: sent.attempt,
        bounceType: event.bounceType,
        bounceSubType: event.bounceSubType,
      },
    });

    return { handled: true };
  }
}
