import { Module } from "@nestjs/common";
import { CalendarModule } from "../calendar/calendar.module";
import { MaterialsModule } from "../materials/materials.module";
import { SubscriptionsModule } from "../subscriptions/subscriptions.module";
import { InternalCronController } from "./internal-cron.controller";

@Module({
  imports: [CalendarModule, MaterialsModule, SubscriptionsModule],
  controllers: [InternalCronController],
})
export class InternalCronModule {}
