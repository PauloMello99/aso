import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { MailService } from "./application/mail.service";
import { EMAIL_SENDER } from "./domain/ports/email-sender.port";
import { ResendEmailSender } from "./infrastructure/resend-email-sender";

@Module({
  imports: [ConfigModule],
  providers: [
    { provide: EMAIL_SENDER, useClass: ResendEmailSender },
    MailService,
  ],
  exports: [MailService, EMAIL_SENDER],
})
export class MailModule {}
