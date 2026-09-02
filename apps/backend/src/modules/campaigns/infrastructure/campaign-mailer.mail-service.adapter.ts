import { Injectable } from "@nestjs/common";
import { MailService } from "../../mail/application/mail.service";
import type {
  ICampaignMailer,
  SendCampaignInput,
} from "../domain/campaign-mailer.port";

/**
 * Adapter de `ICampaignMailer` sobre o `MailService` central (módulo `mail`).
 *
 * Delega para `MailService.sendCampaignByTrigger`, que escolhe o template de
 * campanha pelo `trigger`, renderiza e despacha. O contrato da porta é
 * preservado pelo `dispatch` do `MailService`: no-op silencioso quando o canal
 * de e-mail está desligado (o `false` do sender é engolido) e throw em falha
 * real de envio.
 */
@Injectable()
export class CampaignMailerMailServiceAdapter implements ICampaignMailer {
  constructor(private readonly mailService: MailService) {}

  async sendCampaign(input: SendCampaignInput): Promise<void> {
    await this.mailService.sendCampaignByTrigger({
      to: input.to,
      trigger: input.trigger,
      subject: input.subject,
      body: input.body,
      customerName: input.customerName,
      orgName: input.orgName,
      unsubscribeUrl: input.unsubscribeUrl,
    });
  }
}
