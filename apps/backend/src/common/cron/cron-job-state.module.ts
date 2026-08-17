import { Module } from "@nestjs/common";
import { CRON_JOB_STATE_REPOSITORY } from "./cron-job-state.repository.interface";
import { DrizzleCronJobStateRepository } from "./infrastructure/drizzle-cron-job-state.repository";

/**
 * Standalone module for the cron self-throttle state (`cron_job_state`
 * table). Deliberately lives in `common/`, not inside `internal-cron/`:
 * `InternalCronModule` already imports `SubscriptionsModule` (to reach
 * `ReconcileSubscriptionsUseCase`/`ExpireSubscriptionsUseCase`), so if
 * `SubscriptionsModule` needed to import `InternalCronModule` back to reach
 * `CRON_JOB_STATE_REPOSITORY` (for `ReconcilePlanCatalogUseCase`'s
 * self-throttling) that would be a circular module dependency. Both
 * `InternalCronModule` and `SubscriptionsModule` (or any future module that
 * needs a throttled job) import this neutral module instead — neither
 * imports the other for this concern.
 *
 * `DRIZZLE_ADMIN` comes from the `@Global()` `DatabaseModule`, so no import
 * is needed here for it.
 */
@Module({
  providers: [
    {
      provide: CRON_JOB_STATE_REPOSITORY,
      useClass: DrizzleCronJobStateRepository,
    },
  ],
  exports: [CRON_JOB_STATE_REPOSITORY],
})
export class CronJobStateModule {}
