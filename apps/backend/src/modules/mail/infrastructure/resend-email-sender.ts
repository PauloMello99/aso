import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Resend } from "resend";
import { EmailAllowlistService } from "../application/email-allowlist.service";
import type {
  IEmailSender,
  SendEmailInput,
} from "../domain/ports/email-sender.port";

@Injectable()
export class ResendEmailSender implements IEmailSender {
  private readonly logger = new Logger(ResendEmailSender.name);
  private readonly enabled: boolean;
  private readonly from: string;
  private readonly client: Resend | null;

  constructor(
    config: ConfigService,
    private readonly allowlist: EmailAllowlistService,
  ) {
    const flag = config.get<string>("NOTIFICATIONS_EMAIL_ENABLED") === "true";
    const apiKey = config.get<string>("RESEND_API_KEY") ?? "";
    this.from =
      config.get<string>("NOTIFICATIONS_FROM_EMAIL") ??
      "ASO <no-reply@assessorink-so.com>";
    this.enabled = flag && apiKey.length > 0;
    this.client = this.enabled ? new Resend(apiKey) : null;
  }

  async send(input: SendEmailInput): Promise<boolean> {
    if (!this.enabled || !this.client) {
      this.logger.debug(
        `Email desabilitado — no-op para "${input.subject}" → ${input.to}`,
      );
      return false;
    }

    if (!this.allowlist.isAllowed(input.to)) {
      const atIndex = input.to.indexOf("@");
      const domain = atIndex === -1 ? "(sem @)" : input.to.slice(atIndex);
      this.logger.warn(
        `Bloqueado pela allowlist de e-mail (fora de produção): "${input.subject}" → domínio ${domain}`,
      );
      return false;
    }

    const { data, error } = await this.client.emails.send({
      from: this.from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      ...(input.text ? { text: input.text } : {}),
      ...(input.replyTo ? { replyTo: input.replyTo } : {}),
      ...(input.tags
        ? {
            tags: Object.entries(input.tags).map(([name, value]) => ({
              name,
              value,
            })),
          }
        : {}),
    });

    if (error) {
      this.logger.error(
        `Falha ao enviar e-mail para ${input.to}: ${error.message}`,
      );
      throw new Error(`Resend send failed: ${error.message}`);
    }

    this.logger.debug(`E-mail enviado para ${input.to} (id: ${data?.id})`);
    return true;
  }
}
