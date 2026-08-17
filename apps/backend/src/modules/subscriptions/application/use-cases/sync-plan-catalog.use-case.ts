import { Inject, Injectable, Logger } from "@nestjs/common";
import type { BillingInterval } from "../../domain/subscription.entity";
import {
  PLAN_CATALOG,
  PlanCatalogEntry,
  PlanCatalogPriceEntry,
} from "../../domain/plan-catalog";
import {
  IPaymentGateway,
  PAYMENT_GATEWAY,
} from "../../domain/ports/payment-gateway.port";
import {
  BILLING_PLAN_REPOSITORY,
  BillingPlanEntity,
  IBillingPlanRepository,
} from "../../domain/billing-plan.repository.interface";
import {
  BILLING_PLAN_PRICE_REPOSITORY,
  BillingPlanPriceEntity,
  IBillingPlanPriceRepository,
} from "../../domain/billing-plan-price.repository.interface";
import { StripeCatalogSyncFailedException } from "../../domain/exceptions/stripe-catalog-sync-failed.exception";

/**
 * "drift" replaces the old automatic "rotated": if the local
 * `billing_plan_prices` row has an `amountCents` different from the static
 * `priceCents` in PLAN_CATALOG, the sync no longer mints a new Price to "fix"
 * it — it just reports the divergence. Rotating a price is an explicit admin
 * action (future PR), never an implicit side effect of booting the app.
 *
 * "created" also covers the case where a Stripe Price for the lookup_key
 * already existed (e.g. local row was reset) and gets adopted as-is into a
 * new local row: from the caller's point of view a local row now exists that
 * didn't before, which is what "created" communicates. We deliberately do
 * NOT introduce a separate "adopted" status — this report shape is only
 * consumed internally (this use-case runs exclusively from
 * `PlanCatalogService.onModuleInit` at boot; the old manual sync endpoint,
 * `POST /admin/billing/plans/sync`, was removed — see ADR-0024) and widening
 * the status union crosses that shape for no benefit; "drift" already flags
 * the one case where the adopted Stripe amount disagrees with the catalog.
 *
 * "unchanged" also covers a (plan, interval) with no ACTIVE row but that
 * already has SOME row (active or not) locally — most commonly an interval
 * an admin deliberately disabled via `SetPlanIntervalActiveUseCase`. The
 * sync never tries to create/adopt a new Price for it (that would violate
 * the `stripe_price_id` unique constraint, since Stripe still has the old
 * Price) and never widens the status union for it either — same rationale
 * as the "created"/"adopted" merge above.
 */
export type SyncPlanCatalogEntryStatus =
  | "created"
  | "unchanged"
  | "drift"
  | "failed";

export interface SyncPlanCatalogEntryResult {
  key: string;
  interval: BillingInterval;
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
 * product and, for each of its `prices` (one per billing interval), a
 * Stripe Price plus a row in `billing_plan_prices`. PLAN_CATALOG is seed
 * data only: once a `billing_plans` row and a `billing_plan_prices` row for
 * a given (key, interval) exist, those rows are the source of truth — the
 * sync neither overwrites them nor rotates the Stripe Price to match the
 * static array (a divergence is reported as `status: "drift"`, never
 * auto-corrected). Only (key, interval) pairs with NO row at all (active or
 * not) yet are seeded from the catalog — a pair with an inactive row is
 * left alone (`status: "unchanged"`), never re-seeded.
 *
 * `billing_plans` itself still carries legacy single-price columns
 * (amountCents/currency/interval) that a later PR in this series removes;
 * until then we satisfy their NOT NULL/required-type constraints using the
 * first entry of `entry.prices` when creating a brand-new plan row. Those
 * columns are not touched again afterwards.
 *
 * The report has one row per (key, interval) — not per plan — so a failure
 * on one price never hides the status of its siblings. A failure on any
 * entry surfaces as a thrown error (StripeCatalogSyncFailedException)
 * carrying the full report, so callers (boot hook, admin endpoint) can
 * decide how to react.
 */
@Injectable()
export class SyncPlanCatalogUseCase {
  private readonly logger = new Logger(SyncPlanCatalogUseCase.name);

  constructor(
    @Inject(PAYMENT_GATEWAY) private readonly gateway: IPaymentGateway,
    @Inject(BILLING_PLAN_REPOSITORY)
    private readonly billingPlanRepo: IBillingPlanRepository,
    @Inject(BILLING_PLAN_PRICE_REPOSITORY)
    private readonly billingPlanPriceRepo: IBillingPlanPriceRepository,
  ) {}

  async execute(): Promise<SyncPlanCatalogReport> {
    const results: SyncPlanCatalogEntryResult[] = [];

    for (const entry of PLAN_CATALOG) {
      try {
        const plan = await this.ensurePlanRow(entry);

        for (const priceEntry of entry.prices) {
          try {
            const result = await this.syncPrice(entry, plan, priceEntry);
            results.push(result);
          } catch (error) {
            this.logger.error(
              `Failed to sync price for plan "${entry.key}" interval "${priceEntry.interval}" with Stripe`,
              error instanceof Error ? error.stack : String(error),
            );
            results.push({
              key: entry.key,
              interval: priceEntry.interval,
              status: "failed",
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }
      } catch (error) {
        this.logger.error(
          `Failed to sync plan catalog entry "${entry.key}" with Stripe`,
          error instanceof Error ? error.stack : String(error),
        );
        for (const priceEntry of entry.prices) {
          results.push({
            key: entry.key,
            interval: priceEntry.interval,
            status: "failed",
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }

    const report: SyncPlanCatalogReport = { results };
    const failedKeys = results
      .filter((r) => r.status === "failed")
      .map((r) => `${r.key}:${r.interval}`);

    if (failedKeys.length > 0) {
      throw new StripeCatalogSyncFailedException<SyncPlanCatalogReport>(
        report,
        failedKeys,
      );
    }

    return report;
  }

  /**
   * Guarantees a `billing_plans` row exists for `entry.key` and that its
   * Stripe Product is ensured. If the row already exists, it is the source
   * of truth for its (legacy) name/description/product — we never overwrite
   * it here, we only make sure the Stripe Product referenced by it exists.
   */
  private async ensurePlanRow(
    entry: PlanCatalogEntry,
  ): Promise<BillingPlanEntity> {
    const existingRow = await this.billingPlanRepo.findByKey(entry.key);

    if (existingRow) {
      const productKey = existingRow.productKey ?? entry.productKey;
      const { productId } = await this.gateway.ensureProduct({
        id: productKey,
        name: existingRow.name,
        description: existingRow.description ?? undefined,
      });

      return this.billingPlanRepo.updateByKey(existingRow.key, {
        stripeProductId: productId,
        productKey,
        lastSyncedAt: new Date(),
      });
    }

    const { productId } = await this.gateway.ensureProduct({
      id: entry.productKey,
      name: entry.name,
      description: entry.description,
    });

    const [firstPrice] = entry.prices;
    if (!firstPrice) {
      throw new Error(
        `PLAN_CATALOG entry "${entry.key}" has no prices — at least one is required to seed the legacy billing_plans columns`,
      );
    }

    return this.billingPlanRepo.upsert({
      key: entry.key,
      stripeProductId: productId,
      name: entry.name,
      description: entry.description ?? null,
      // Legacy single-price columns on billing_plans, kept only to satisfy
      // the current (pre-removal) required shape of UpsertBillingPlanData.
      // Seeded from the first price entry; not treated as the source of
      // truth for pricing — billing_plan_prices is.
      amountCents: firstPrice.priceCents,
      currency: firstPrice.currency,
      interval: firstPrice.interval,
      active: true,
      metadata: entry.metadata,
      lookupKey: firstPrice.lookupKey,
      productKey: entry.productKey,
      lastSyncedAt: new Date(),
    });
  }

  private async syncPrice(
    entry: PlanCatalogEntry,
    plan: BillingPlanEntity,
    priceEntry: PlanCatalogPriceEntry,
  ): Promise<SyncPlanCatalogEntryResult> {
    const existing = await this.billingPlanPriceRepo.findActiveByPlanIdAndInterval(
      plan.id,
      priceEntry.interval,
    );

    if (existing) {
      return this.reportExistingPrice(entry, priceEntry, existing);
    }

    // No ACTIVE row, but a row (active or not) may still exist for this
    // (plan, interval): an admin may have deliberately disabled it via
    // SetPlanIntervalActiveUseCase (updateById({active:false}), which
    // PRESERVES stripePriceId/lookupKey — unlike deactivateById, used only
    // by price rotation). Minting/adopting a Price in that case would try
    // to INSERT a new row whose stripePriceId already exists in Stripe
    // under that lookup_key, violating billing_plan_prices_stripe_price_id
    // _unique. Respect the admin's deliberate disable and skip.
    const anyRow = await this.billingPlanPriceRepo.findByPlanIdAndInterval(
      plan.id,
      priceEntry.interval,
    );
    if (anyRow) {
      this.logger.log(
        `Skipping sync for "${entry.key}" (${priceEntry.interval}): a (possibly inactive) row already exists locally — respecting deliberate admin disable, not creating/adopting a new price.`,
      );
      return {
        key: entry.key,
        interval: priceEntry.interval,
        status: "unchanged",
        stripePriceId: anyRow.stripePriceId ?? undefined,
      };
    }

    return this.createOrAdoptPrice(entry, plan, priceEntry);
  }

  /**
   * `billing_plan_prices` already has an ACTIVE row for this (plan,
   * interval): it is the source of truth. We never mint a new Price to "fix"
   * a divergent amount here — that is an explicit admin action (price
   * rotation), not a boot-time side effect.
   */
  private reportExistingPrice(
    entry: PlanCatalogEntry,
    priceEntry: PlanCatalogPriceEntry,
    existing: BillingPlanPriceEntity,
  ): SyncPlanCatalogEntryResult {
    if (existing.amountCents !== priceEntry.priceCents) {
      this.logger.warn(
        `Price drift detected for "${entry.key}" (${priceEntry.interval}): billing_plan_prices.amountCents=${existing.amountCents}, PLAN_CATALOG.priceCents=${priceEntry.priceCents}. Not auto-rotating — use the admin price update action.`,
      );
      return {
        key: entry.key,
        interval: priceEntry.interval,
        status: "drift",
        stripePriceId: existing.stripePriceId ?? undefined,
      };
    }

    return {
      key: entry.key,
      interval: priceEntry.interval,
      status: "unchanged",
      stripePriceId: existing.stripePriceId ?? undefined,
    };
  }

  /**
   * No row at all — active or not — in `billing_plan_prices` yet for this
   * (plan, interval): first boot, or a brand-new interval added to an
   * existing plan. `syncPrice` already ruled out the case where SOME row
   * exists but isn't active (deliberately admin-disabled interval, or a
   * row `ReconcilePlanCatalogUseCase` deactivated because the Stripe Price
   * vanished/was archived out-of-band) — those are reported as "unchanged"
   * and never reach this method, since re-adopting a Price for either case
   * without human review could silently resurrect a checkout path someone
   * (admin or Stripe dashboard) intentionally retired. Looks up Stripe by
   * lookup_key first: if a Price already exists there, adopt it into a new
   * local row instead of minting a duplicate; otherwise create a fresh
   * Stripe Price.
   */
  private async createOrAdoptPrice(
    entry: PlanCatalogEntry,
    plan: BillingPlanEntity,
    priceEntry: PlanCatalogPriceEntry,
  ): Promise<SyncPlanCatalogEntryResult> {
    const stripeProductId = plan.stripeProductId;
    if (!stripeProductId) {
      throw new Error(
        `billing_plans row for "${entry.key}" has no stripeProductId — ensurePlanRow should have set it`,
      );
    }

    const existingStripePrice = await this.gateway.findPriceByLookupKey(
      priceEntry.lookupKey,
    );

    let stripePriceId: string;
    let amountCents: number;
    let status: SyncPlanCatalogEntryStatus;

    if (existingStripePrice) {
      // Adopt the Stripe Price that already exists for this lookup_key
      // rather than minting a duplicate. The local row records what Stripe
      // is actually charging (existingStripePrice.unitAmount), not the
      // catalog value — divergence between the two is reported as "drift",
      // mirroring the historical seedFromCatalog behavior.
      stripePriceId = existingStripePrice.priceId;
      amountCents = existingStripePrice.unitAmount ?? priceEntry.priceCents;
      status =
        existingStripePrice.unitAmount === priceEntry.priceCents
          ? "created"
          : "drift";
    } else {
      const created = await this.gateway.createPrice({
        productId: stripeProductId,
        amountCents: priceEntry.priceCents,
        currency: priceEntry.currency,
        interval: priceEntry.interval,
        lookupKey: priceEntry.lookupKey,
      });
      stripePriceId = created.priceId;
      amountCents = priceEntry.priceCents;
      status = "created";
    }

    await this.billingPlanPriceRepo.create({
      planId: plan.id,
      interval: priceEntry.interval,
      amountCents,
      currency: priceEntry.currency,
      stripePriceId,
      lookupKey: priceEntry.lookupKey,
      active: true,
    });

    return {
      key: entry.key,
      interval: priceEntry.interval,
      status,
      stripeProductId,
      stripePriceId,
    };
  }
}
