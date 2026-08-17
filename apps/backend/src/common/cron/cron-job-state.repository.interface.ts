export const CRON_JOB_STATE_REPOSITORY = Symbol("CRON_JOB_STATE_REPOSITORY");

export interface ICronJobStateRepository {
  /**
   * Atomically claims the right to run `jobName` now: succeeds (`true`) and
   * persists `at` as the new `last_run_at` only if no prior run is recorded
   * yet or the prior run is older than `minIntervalMs`. Implemented as a
   * single `INSERT ... ON CONFLICT DO UPDATE ... WHERE` so two concurrent
   * cron ticks can never both observe "throttle not hit" and both proceed —
   * the conditional UPDATE's WHERE clause is the mutual-exclusion point, not
   * an application-level check-then-act (which would race). Replaces the
   * former separate `getLastRunAt`/`markRun` pair for exactly this reason.
   */
  claimRun(jobName: string, at: Date, minIntervalMs: number): Promise<boolean>;
}
