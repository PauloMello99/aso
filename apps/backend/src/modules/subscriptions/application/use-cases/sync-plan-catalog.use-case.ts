import { Inject, Injectable, Logger } from "@nestjs/common";
import type { BillingInterval } from "../../domain/subscription.entity";
import { PLAN_CATALOG, PlanCatalogEntry } from "../../domain/plan-catalog";
import {
  IPaymentGateway,
  PAYMENT_GATEWAY,
} from "../../domain/ports/payment-gateway.port";
import {
  BILLING_PLAN_REPOSITORY,
  BillingPlanEntity,
  IBillingPlanRepository,
} from "../../domain/billing-plan.repository.interface";
import { StripeCatalogSyncFailedException } from "../../domain/exceptions/stripe-catalog-sync-failed.exception";

/**
 * "drift" replaces the old automatic "rotated": if the Stripe Price found by
 * lookup_key has a unitAmount different from the amountCents stored locally
 * in `billing_plans`, the sync no longer mints a new Price to "fix" it — it
 * just reports the divergence. Rotating a price is an explicit admin action
 * (future PR), never an implicit side effect of booting the app.
 */
export type SyncPlanCatalogEntryStatus =
  | "created"
  | "unchanged"
  | "drift"
  | "failed";

export interface SyncPlanCatalogEntryResult {
  key: string;
  status: SyncPlanCatalogEntryStatus;
  stripeProductId?: string;
  stripePriceId?: string;
  error?: string;
}

export interface SyncPlanCatalogReport {
  results: SyncPlanCatalogEntryResult[];
}

/**
 * Ensures every entry in PLAN_CATALOG has a corresponding Stripe
 * product/price and a row in billing_plans. PLAN_CATALOG is seed data only:
 * when a row already exists for an entry's key, the row's values are the
 * source of truth and the sync neither overwrites them nor rotates the
 * Stripe Price to match the static array (a divergence is reported as
 * `status: "drift"`, never auto-corrected). Only keys with no row yet are
 * seeded from the catalog. Unlike a silent best-effort loop, a failure on
 * any entry surfaces as a thrown error (StripeCatalogSyncFailedException)
 * carrying the full per-entry report, so callers (boot hook, admin
 * endpoint) can decide how to react.
 */
@Injectable()
export class SyncPlanCatalogUseCase {
  private readonly logger = new Logger(SyncPlanCatalogUseCase.name);

  constructor(
    @Inject(PAYMENT_GATEWAY) private readonly gateway: IPaymentGateway,
    @Inject(BILLING_PLAN_REPOSITORY)
    private readonly billingPlanRepo: IBillingPlanRepository,
  ) {}

  async execute(): Promise<SyncPlanCatalogReport> {
    const results: SyncPlanCatalogEntryResult[] = [];

    for (const entry of PLAN_CATALOG) {
      try {
        const existingRow = await this.billingPlanRepo.findByKey(entry.key);

        const result = existingRow
          ? await this.syncExistingRow(entry, existingRow)
          : await this.seedFromCatalog(entry);

        results.push(result);
      } catch (error) {
        this.logger.error(
          `Failed to sync plan catalog entry "${entry.key}" with Stripe`,
          error instanceof Error ? error.stack : String(error),
        );
        results.push({
          key: entry.key,
          status: "failed",
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const report: SyncPlanCatalogReport = { results };
    const failedKeys = results
      .filter((r) => r.status === "failed")
      .map((r) => r.key);

    if (failedKeys.length > 0) {
      throw new StripeCatalogSyncFailedException<SyncPlanCatalogReport>(
        report,
        failedKeys,
      );
    }

    return report;
  }

  /**
   * `billing_plans` already has a row for this key: it is the source of
   * truth for its values. We only guarantee the Stripe Product/Price exist
   * — we never overwrite the row with seed values, and we never mint a new
   * Price to "fix" a divergent amount (that is now an explicit admin
   * action). `entry.productKey`/`entry.lookupKey` are used only as a
   * fallback for legacy rows that predate those columns (nullable).
   */
  private async syncExistingRow(
    entry: PlanCatalogEntry,
    row: BillingPlanEntity,
  ): Promise<SyncPlanCatalogEntryResult> {
    const productKey = row.productKey ?? entry.productKey;
    const lookupKey = row.lookupKey ?? entry.lookupKey;

    const { productId } = await this.gateway.ensureProduct({
      id: productKey,
      name: row.name,
      description: row.description ?? undefined,
    });

    const existingPrice = await this.gateway.findPriceByLookupKey(lookupKey);

    let priceId: string;
    let status: SyncPlanCatalogEntryStatus;

    if (!existingPrice) {
      const created = await this.gateway.createPrice({
        productId,
        amountCents: row.amountCents,
        currency: row.currency,
        interval: row.interval as BillingInterval,
        lookupKey,
      });
      priceId = created.priceId;
      status = "created";
    } else if (existingPrice.unitAmount !== row.amountCents) {
      this.logger.warn(
        `Price drift detected for "${row.key}": Stripe unitAmount=${existingPrice.unitAmount}, billing_plans.amountCents=${row.amountCents}. Not auto-rotating — use the admin price update action.`,
      );
      priceId = existingPrice.priceId;
      status = "drift";
    } else {
      priceId = existingPrice.priceId;
      status = "unchanged";
    }

    await this.billingPlanRepo.updateByKey(row.key, {
      stripeProductId: productId,
      stripePriceId: priceId,
      lookupKey,
      productKey,
      lastSyncedAt: new Date(),
    });

    return {
      key: row.key,
      status,
      stripeProductId: productId,
      stripePriceId: priceId,
    };
  }

  /**
   * No row in `billing_plans` yet for this key (first boot, or a brand-new
   * plan added to PLAN_CATALOG): seed the row from the static catalog, same
   * as the historical behavior.
   */
  private async seedFromCatalog(
    entry: PlanCatalogEntry,
  ): Promise<SyncPlanCatalogEntryResult> {
    const { productId } = await this.gateway.ensureProduct({
      id: entry.productKey,
      name: entry.name,
      description: entry.description,
    });

    const existingPrice = await this.gateway.findPriceByLookupKey(
      entry.lookupKey,
    );

    let priceId: string;
    let status: SyncPlanCatalogEntryStatus;

    if (!existingPrice) {
      const created = await this.gateway.createPrice({
        productId,
        amountCents: entry.priceCents,
        currency: entry.currency,
        interval: entry.interval,
        lookupKey: entry.lookupKey,
      });
      priceId = created.priceId;
      status = "created";
    } else {
      // A Price with this lookup_key already exists in Stripe even though
      // there was no local row yet (e.g. row deleted/reset). Adopt it as-is
      // rather than minting a duplicate; report drift if amounts disagree.
      priceId = existingPrice.priceId;
      status =
        existingPrice.unitAmount === entry.priceCents ? "unchanged" : "drift";
    }

    await this.billingPlanRepo.upsert({
      key: entry.key,
      stripeProductId: productId,
      stripePriceId: priceId,
      name: entry.name,
      description: entry.description ?? null,
      amountCents: entry.priceCents,
      currency: entry.currency,
      interval: entry.interval,
      active: true,
      metadata: entry.metadata,
      lookupKey: entry.lookupKey,
      productKey: entry.productKey,
      lastSyncedAt: new Date(),
    });

    return {
      key: entry.key,
      status,
      stripeProductId: productId,
      stripePriceId: priceId,
    };
  }
}
