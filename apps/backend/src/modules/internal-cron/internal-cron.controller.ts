import { Controller, HttpCode, Post, UseGuards } from "@nestjs/common";
import { CronSecretGuard } from "../../common/guards/cron-secret.guard";
import { CRON_JOBS } from "../../common/cron/cron-jobs";
import { SendAgendaRemindersUseCase } from "../calendar/application/use-cases/send-agenda-reminders.use-case";
import { SendStockCheckRemindersUseCase } from "../materials/application/use-cases/send-stock-check-reminders.use-case";
import { ReconcileSubscriptionsUseCase } from "../subscriptions/application/use-cases/reconcile-subscriptions.use-case";
import { ExpireSubscriptionsUseCase } from "../subscriptions/application/use-cases/expire-subscriptions.use-case";
import { ReconcilePlanCatalogUseCase } from "../subscriptions/application/use-cases/reconcile-plan-catalog.use-case";
import { SweepTicketSlaUseCase } from "../support/application/use-cases/sweep-ticket-sla.use-case";

interface JobResult {
  name: string;
  status: "ok" | "error";
  durationMs: number;
  error?: string;
}

@Controller("internal/cron")
@UseGuards(CronSecretGuard)
export class InternalCronController {
  constructor(
    private readonly sendAgendaReminders: SendAgendaRemindersUseCase,
    private readonly sendStockCheckReminders: SendStockCheckRemindersUseCase,
    private readonly reconcileSubscriptions: ReconcileSubscriptionsUseCase,
    private readonly expireSubscriptions: ExpireSubscriptionsUseCase,
    private readonly reconcilePlanCatalog: ReconcilePlanCatalogUseCase,
    private readonly sweepTicketSla: SweepTicketSlaUseCase,
  ) {}

  @Post("tick")
  @HttpCode(200)
  async tick(): Promise<{ ok: boolean; jobs: JobResult[] }> {
    const jobs: Array<{ name: string; run: () => Promise<unknown> }> = [
      {
        name: CRON_JOBS.AGENDA_REMINDERS,
        run: () => this.sendAgendaReminders.execute(),
      },
      {
        name: CRON_JOBS.STOCK_CHECK_REMINDERS,
        run: () => this.sendStockCheckReminders.execute(),
      },
      {
        name: CRON_JOBS.BILLING_RECONCILIATION,
        run: () => this.reconcileSubscriptions.execute(),
      },
      {
        name: CRON_JOBS.BILLING_EXPIRY_SWEEP,
        run: () => this.expireSubscriptions.execute(),
      },
      {
        // Self-throttled inside the use-case (runs at most once every 3
        // days) — invoked on every tick like the other jobs, but most calls
        // are a cheap no-op claim check.
        name: CRON_JOBS.BILLING_CATALOG_RECONCILIATION,
        run: () => this.reconcilePlanCatalog.execute(),
      },
      {
        name: CRON_JOBS.TICKET_SLA_SWEEP,
        run: () => this.sweepTicketSla.execute(),
      },
    ];

    const jobResults = await Promise.all(
      jobs.map(async (job): Promise<JobResult> => {
        const t0 = Date.now();
        try {
          await job.run();
          return { name: job.name, status: "ok", durationMs: Date.now() - t0 };
        } catch (err) {
          return {
            name: job.name,
            status: "error",
            durationMs: Date.now() - t0,
            error: err instanceof Error ? err.message : String(err),
          };
        }
      }),
    );

    return { ok: true, jobs: jobResults };
  }
}
