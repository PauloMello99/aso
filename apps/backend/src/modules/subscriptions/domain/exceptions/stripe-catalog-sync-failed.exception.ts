import { DomainException } from "../../../../common/exceptions/domain.exception";

/**
 * Thrown when at least one PLAN_CATALOG entry fails to sync with Stripe.
 * Carries the full sync report (including successful entries) so callers
 * can inspect what did and didn't sync. `TReport` is generic on purpose:
 * the domain layer must not import the report shape from the application
 * layer (SyncPlanCatalogReport lives in
 * application/use-cases/sync-plan-catalog.use-case.ts).
 */
export class StripeCatalogSyncFailedException<
  TReport = unknown,
> extends DomainException {
  readonly code = "STRIPE_CATALOG_SYNC_FAILED";

  constructor(
    public readonly report: TReport,
    failedKeys: string[],
  ) {
    super(`Stripe catalog sync failed for: ${failedKeys.join(", ")}`);
  }
}
