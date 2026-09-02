import type { TiptapDoc } from "./campaign-body";
import type { CampaignTrigger } from "./campaign-trigger";

export const CAMPAIGN_MAILER = Symbol("CAMPAIGN_MAILER");

/**
 * Porta de saída para o envio efetivo de um e-mail de campanha. Mantida no
 * domínio (sem `MailService`) para o `RunCampaignTriggersUseCase` continuar
 * testável com um mock tipado.
 *
 * Contrato:
 *   - LANÇA em falha real de envio (o use-case captura por alvo e grava a linha
 *     `failed` de `campaign_sends`).
 *   - É no-op SILENCIOSO quando o canal de e-mail está desligado — por isso o
 *     use-case checa o canal ANTES de reivindicar o tick: um lote com canal
 *     desligado queimaria o `dedupe_key` (linha `sent`) sem entregar nada.
 *
 * Implementada por `CampaignMailerMailServiceAdapter` sobre o `MailService`
 * central (delega para `MailService.sendCampaignByTrigger`).
 */
export interface SendCampaignInput {
  to: string;
  trigger: CampaignTrigger;
  subject: string;
  body: TiptapDoc;
  customerName: string;
  orgName: string;
  unsubscribeUrl: string;
}

export interface ICampaignMailer {
  sendCampaign(input: SendCampaignInput): Promise<void>;
}
