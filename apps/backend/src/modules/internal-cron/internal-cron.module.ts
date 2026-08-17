import { Module } from "@nestjs/common";
import { CalendarModule } from "../calendar/calendar.module";
import { MaterialsModule } from "../materials/materials.module";
import { SubscriptionsModule } from "../subscriptions/subscriptions.module";
import { SupportInfrastructureModule } from "../support/infrastructure/support-infrastructure.module";
import { SweepTicketSlaUseCase } from "../support/application/use-cases/sweep-ticket-sla.use-case";
import { InternalCronController } from "./internal-cron.controller";

// Note: `CRON_JOB_STATE_REPOSITORY` used to be provided here, but nothing in
// this module injects it directly (only `ReconcilePlanCatalogUseCase`, which
// lives in `SubscriptionsModule`, does). It is now provided by the neutral
// `CronJobStateModule` (`common/cron/`), imported by `SubscriptionsModule`
// itself — see that module's imports and `common/cron/cron-job-state.module.ts`
// for why it isn't imported/exported here instead (would create a circular
// module dependency, since this module already imports `SubscriptionsModule`).
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
