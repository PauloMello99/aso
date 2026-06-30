import { Module } from "@nestjs/common";
import { CalendarModule } from "../calendar/calendar.module";
import { MaterialsModule } from "../materials/materials.module";
import { InternalCronController } from "./internal-cron.controller";

@Module({
  imports: [CalendarModule, MaterialsModule],
  controllers: [InternalCronController],
})
export class InternalCronModule {}
