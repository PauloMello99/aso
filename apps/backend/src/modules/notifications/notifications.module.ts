import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { NotificationService } from "./application/notification.service";
import { NotificationInboxService } from "./application/notification-inbox.service";
import { NotificationsInfrastructureModule } from "./infrastructure/notifications-infrastructure.module";
import { NotificationsController } from "./interface/notifications.controller";

@Module({
  imports: [NotificationsInfrastructureModule, AuthModule],
  controllers: [NotificationsController],
  providers: [NotificationService, NotificationInboxService],
  // NotificationService é reutilizado por outros módulos (ex.: calendar, cron).
  exports: [NotificationService],
})
export class NotificationsModule {}
