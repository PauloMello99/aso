import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { EmailAllowlistService } from "./application/email-allowlist.service";
import { MailService } from "./application/mail.service";
import { EMAIL_SENDER } from "./domain/ports/email-sender.port";
import { ResendEmailSender } from "./infrastructure/resend-email-sender";

@Module({
  imports: [ConfigModule],
  providers: [
    EmailAllowlistService,
    { provide: EMAIL_SENDER, useClass: ResendEmailSender },
    MailService,
  ],
  exports: [MailService, EMAIL_SENDER, EmailAllowlistService],
})
export class MailModule {}
