import { Module } from "@nestjs/common";
import { CalendarModule } from "../calendar/calendar.module";
import { MaterialsModule } from "../materials/materials.module";
import { SubscriptionsModule } from "../subscriptions/subscriptions.module";
import { SupportInfrastructureModule } from "../support/infrastructure/support-infrastructure.module";
import { SweepTicketSlaUseCase } from "../support/application/use-cases/sweep-ticket-sla.use-case";
import { InternalCronController } from "./internal-cron.controller";

@Module({
  imports: [
    CalendarModule,
    MaterialsModule,
    SubscriptionsModule,
    SupportInfrastructureModule,
  ],
  controllers: [InternalCronController],
  providers: [SweepTicketSlaUseCase],
})
export class InternalCronModule {}
