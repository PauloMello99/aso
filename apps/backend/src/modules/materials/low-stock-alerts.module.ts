import { Module } from "@nestjs/common";
import { NotificationsModule } from "../notifications/notifications.module";
import { LowStockAlertService } from "./application/low-stock-alert.service";
import { MaterialsInfrastructureModule } from "./infrastructure/materials-infrastructure.module";

@Module({
  imports: [MaterialsInfrastructureModule, NotificationsModule],
  providers: [LowStockAlertService],
  exports: [LowStockAlertService],
})
export class LowStockAlertsModule {}
