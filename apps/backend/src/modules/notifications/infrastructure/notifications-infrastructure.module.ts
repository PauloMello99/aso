import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { NOTIFICATION_REPOSITORY } from "../domain/notification.repository.interface";
import { EMAIL_SENDER } from "../domain/ports/email-sender.port";
import { DrizzleNotificationRepository } from "./persistence/drizzle-notification.repository";
import { ResendEmailSender } from "./email/resend-email-sender";

@Module({
  imports: [ConfigModule],
  providers: [
    { provide: NOTIFICATION_REPOSITORY, useClass: DrizzleNotificationRepository },
    { provide: EMAIL_SENDER, useClass: ResendEmailSender },
  ],
  exports: [NOTIFICATION_REPOSITORY, EMAIL_SENDER],
})
export class NotificationsInfrastructureModule {}
