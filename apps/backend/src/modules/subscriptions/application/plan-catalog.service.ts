import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { SyncPlanCatalogUseCase } from "./use-cases/sync-plan-catalog.use-case";
import { TelemetryService } from "../../../common/telemetry/telemetry.service";

/**
 * On boot, ensures every entry in PLAN_CATALOG has a corresponding Stripe
 * product/price and a synced row in billing_plans. Never throws: a Stripe
 * outage at boot must not prevent the application from starting. Failures
 * are logged and reported to telemetry (Better Stack) instead of only being
 * logged, since Logger.error alone does not reach Better Stack.
 */
@Injectable()
export class PlanCatalogService implements OnModuleInit {
  private readonly logger = new Logger(PlanCatalogService.name);

  constructor(
    private readonly syncPlanCatalog: SyncPlanCatalogUseCase,
    private readonly telemetry: TelemetryService,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      const report = await this.syncPlanCatalog.execute();
      const summary = report.results
        .map((r) => `${r.key}=${r.status}`)
        .join(", ");
      this.logger.log(`Plan catalog sync complete: ${summary}`);
    } catch (error) {
      this.logger.error(
        "Failed to sync plan catalog with Stripe",
        error instanceof Error ? error.stack : String(error),
      );
      this.telemetry.captureException(error, {
        module: "subscriptions",
        code: "PLAN_CATALOG_SYNC_FAILED",
      });
    }
  }
}
