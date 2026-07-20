import { Controller, HttpCode, Post, UseGuards } from "@nestjs/common";
import { CronSecretGuard } from "../../common/guards/cron-secret.guard";
import { SendAgendaRemindersUseCase } from "../calendar/application/use-cases/send-agenda-reminders.use-case";
import { SendStockCheckRemindersUseCase } from "../materials/application/use-cases/send-stock-check-reminders.use-case";
import { ReconcileSubscriptionsUseCase } from "../subscriptions/application/use-cases/reconcile-subscriptions.use-case";
import { ExpireSubscriptionsUseCase } from "../subscriptions/application/use-cases/expire-subscriptions.use-case";

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
  ) {}

  @Post("tick")
  @HttpCode(200)
  async tick(): Promise<{ ok: boolean; jobs: JobResult[] }> {
    const jobs: Array<{ name: string; run: () => Promise<unknown> }> = [
      { name: "agenda-reminders", run: () => this.sendAgendaReminders.execute() },
      { name: "stock-check-reminders", run: () => this.sendStockCheckReminders.execute() },
      { name: "billing-reconciliation", run: () => this.reconcileSubscriptions.execute() },
      { name: "billing-expiry-sweep", run: () => this.expireSubscriptions.execute() },
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
