import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { MailService } from "./application/mail.service";
import { EMAIL_SENDER } from "./domain/ports/email-sender.port";
import { ResendEmailSender } from "./infrastructure/resend-email-sender";

/**
 * Módulo compartilhado de e-mail transacional (React Email + Resend).
 * Sem dependência de auth/notifications (evita ciclos). Importado por auth,
 * organizations e notifications.
 */
@Module({
  imports: [ConfigModule],
  providers: [
    { provide: EMAIL_SENDER, useClass: ResendEmailSender },
    MailService,
  ],
  exports: [MailService, EMAIL_SENDER],
})
export class MailModule {}
