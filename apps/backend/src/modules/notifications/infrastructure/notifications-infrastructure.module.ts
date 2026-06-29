import { Module } from "@nestjs/common";
import { NOTIFICATION_REPOSITORY } from "../domain/notification.repository.interface";
import { DrizzleNotificationRepository } from "./persistence/drizzle-notification.repository";

@Module({
  providers: [
    { provide: NOTIFICATION_REPOSITORY, useClass: DrizzleNotificationRepository },
  ],
  exports: [NOTIFICATION_REPOSITORY],
})
export class NotificationsInfrastructureModule {}
