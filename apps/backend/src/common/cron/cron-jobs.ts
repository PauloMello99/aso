/**
 * Canonical list of internal cron job names, shared between
 * `InternalCronController` (the `POST /internal/cron/tick` dispatch loop)
 * and any use-case that needs its own job name for self-throttling (e.g.
 * `ReconcilePlanCatalogUseCase` via `ICronJobStateRepository.claimRun`). A
 * single source avoids a silent typo mismatch between the dispatcher's job
 * name and the throttled use-case's own `JOB_NAME` constant.
 */
export const CRON_JOBS = {
  AGENDA_REMINDERS: "agenda-reminders",
  STOCK_CHECK_REMINDERS: "stock-check-reminders",
  BILLING_RECONCILIATION: "billing-reconciliation",
  BILLING_EXPIRY_SWEEP: "billing-expiry-sweep",
  TICKET_SLA_SWEEP: "ticket-sla-sweep",
  BILLING_CATALOG_RECONCILIATION: "billing-catalog-reconciliation",
  BILLING_REFUND_RECONCILIATION: "billing-refund-reconciliation",
  CAMPAIGN_TRIGGERS: "campaign-triggers",
} as const;

export type CronJobName = (typeof CRON_JOBS)[keyof typeof CRON_JOBS];
