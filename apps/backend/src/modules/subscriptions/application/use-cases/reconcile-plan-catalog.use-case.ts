import { Inject, Injectable, Logger } from "@nestjs/common";
import { CRON_JOBS } from "../../../../common/cron/cron-jobs";
import {
  CRON_JOB_STATE_REPOSITORY,
  ICronJobStateRepository,
} from "../../../../common/cron/cron-job-state.repository.interface";
import { TelemetryService } from "../../../../common/telemetry/telemetry.service";
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
import { FrontendRevalidationClient } from "../../infrastructure/frontend-revalidation.client";

export interface ReconcilePlanCatalogDiff {
  planKey: string;
  interval?: string;
  field: string;
  oldValue: string;
  newValue: string;
}

export interface ReconcilePlanCatalogResult {
  skipped: boolean;
  changed: boolean;
  results?: ReconcilePlanCatalogDiff[];
}

const JOB_NAME: string = CRON_JOBS.BILLING_CATALOG_RECONCILIATION;
const MIN_INTERVAL_MS = 3 * 24 * 60 * 60 * 1000;

/**
 * Deliberately INVERTS the direction of ADR-0023 ("billing_plans /
 * billing_plan_prices are the source of truth, Stripe is a mirror") for the
 * fields it touches: here Stripe is authoritative and local rows are
 * overwritten to match it. This is a slow drift-correction safety net for
 * out-of-band edits made directly in the Stripe dashboard — day-to-day
 * writes (SyncPlanCatalogUseCase, admin price rotation) remain "DB-first" as
 * ADR-0023 describes and are not affected by this job.
 *
 * Self-throttled to at most once every `MIN_INTERVAL_MS` via an atomic DB
 * claim (`ICronJobStateRepository.claimRun`), not a Nest `@Cron` schedule —
 * it is invoked on every `POST /internal/cron/tick` like the other jobs, but
 * only actually does work once the interval has elapsed.
 */
@Injectable()
export class ReconcilePlanCatalogUseCase {
  private readonly logger = new Logger(ReconcilePlanCatalogUseCase.name);

  constructor(
    @Inject(CRON_JOB_STATE_REPOSITORY)
    private readonly cronJobStateRepo: ICronJobStateRepository,
    @Inject(BILLING_PLAN_REPOSITORY)
    private readonly billingPlanRepo: IBillingPlanRepository,
    @Inject(BILLING_PLAN_PRICE_REPOSITORY)
    private readonly billingPlanPriceRepo: IBillingPlanPriceRepository,
    @Inject(PAYMENT_GATEWAY)
    private readonly gateway: IPaymentGateway,
    private readonly telemetry: TelemetryService,
    private readonly revalidationClient: FrontendRevalidationClient,
  ) {}

  async execute(): Promise<ReconcilePlanCatalogResult> {
    const claimed = await this.cronJobStateRepo.claimRun(
      JOB_NAME,
      new Date(),
      MIN_INTERVAL_MS,
    );
    if (!claimed) {
      return { skipped: true, changed: false };
    }

    const results: ReconcilePlanCatalogDiff[] = [];
    const plans = await this.billingPlanRepo.findAll();

    for (const plan of plans) {
      try {
        await this.reconcilePlan(plan, results);
      } catch (error) {
        this.logger.error(
          `Failed to reconcile plan catalog entry "${plan.key}" against Stripe`,
          error instanceof Error ? error.stack : String(error),
        );
        this.telemetry.captureMessage(
          `Plan catalog reconciliation failed for plan "${plan.key}"`,
          "warn",
          {
            module: "subscriptions",
            code: "PLAN_CATALOG_RECONCILE_FAILED",
            planKey: plan.key,
            error: error instanceof Error ? error.message : String(error),
          },
        );
      }
    }

    this.logger.log(
      `Plan catalog reconciliation complete: plans=${plans.length} diffs=${results.length}`,
    );

    const changed = results.length > 0;
    if (changed) {
      // Best-effort — never throws, never delays the already-committed
      // claimRun/markRun state of this job.
      await this.revalidationClient.revalidate("/");
    }

    return { skipped: false, changed, results };
  }

  private async reconcilePlan(
    plan: BillingPlanEntity,
    results: ReconcilePlanCatalogDiff[],
  ): Promise<void> {
    if (plan.stripeProductId) {
      await this.reconcileProduct(plan, results);
    }

    const prices = await this.billingPlanPriceRepo.findAllByPlanId(plan.id);

    for (const price of prices) {
      if (!price.active || !price.stripePriceId) continue;

      try {
        await this.reconcilePrice(plan, price, results);
      } catch (error) {
        this.logger.error(
          `Failed to reconcile price ${price.id} (plan "${plan.key}", interval "${price.interval}") against Stripe`,
          error instanceof Error ? error.stack : String(error),
        );
        this.telemetry.captureMessage(
          `Plan catalog price reconciliation failed for plan "${plan.key}"`,
          "warn",
          {
            module: "subscriptions",
            code: "PLAN_CATALOG_PRICE_RECONCILE_FAILED",
            planKey: plan.key,
            interval: price.interval,
            error: error instanceof Error ? error.message : String(error),
          },
        );
      }
    }
  }

  /**
   * Stripe products that vanish are not auto-deactivated locally — that is
   * abnormal enough (a Product being deleted, not merely a Price being
   * archived) that it warrants human review rather than a silent automatic
   * deactivation of a whole plan.
   */
  private async reconcileProduct(
    plan: BillingPlanEntity,
    results: ReconcilePlanCatalogDiff[],
  ): Promise<void> {
    const stripeProductId = plan.stripeProductId;
    if (!stripeProductId) return;

    const stripeProduct = await this.gateway.retrieveProduct(stripeProductId);

    if (!stripeProduct) {
      this.logger.warn(
        `Stripe product ${stripeProductId} for plan "${plan.key}" no longer exists — not auto-deactivating, needs manual review`,
      );
      this.telemetry.captureMessage(
        `Stripe product missing for plan "${plan.key}"`,
        "warn",
        {
          module: "subscriptions",
          code: "PLAN_CATALOG_PRODUCT_MISSING",
          planKey: plan.key,
          stripeProductId,
        },
      );
      return;
    }

    const patch: { name?: string; description?: string | null; active?: boolean } =
      {};

    if (stripeProduct.name !== plan.name) {
      results.push({
        planKey: plan.key,
        field: "name",
        oldValue: plan.name,
        newValue: stripeProduct.name,
      });
      patch.name = stripeProduct.name;
    }

    if (stripeProduct.description !== plan.description) {
      results.push({
        planKey: plan.key,
        field: "description",
        oldValue: plan.description ?? "",
        newValue: stripeProduct.description ?? "",
      });
      patch.description = stripeProduct.description;
    }

    if (stripeProduct.active !== plan.active) {
      results.push({
        planKey: plan.key,
        field: "active",
        oldValue: String(plan.active),
        newValue: String(stripeProduct.active),
      });
      patch.active = stripeProduct.active;
    }

    if (Object.keys(patch).length > 0) {
      await this.billingPlanRepo.updateByKey(plan.key, patch);
    }
  }

  /**
   * Unlike a vanished Product, a vanished/archived Stripe Price DOES get its
   * local row deactivated: a Price that is truly gone from Stripe cannot
   * stay "active" locally without breaking checkout in a worse way than
   * losing that interval. `deactivateById` also clears `lookupKey` (required
   * by the partial unique index from migration 0048) so a later
   * rotation/adoption for the same (plan, interval) can reuse it.
   */
  private async reconcilePrice(
    plan: BillingPlanEntity,
    price: BillingPlanPriceEntity,
    results: ReconcilePlanCatalogDiff[],
  ): Promise<void> {
    const stripePriceId = price.stripePriceId;
    if (!stripePriceId) return;

    const stripePrice = await this.gateway.retrievePrice(stripePriceId);

    if (!stripePrice) {
      results.push({
        planKey: plan.key,
        interval: price.interval,
        field: "active",
        oldValue: "true",
        newValue: "false",
      });
      await this.billingPlanPriceRepo.deactivateById(price.id);
      this.logger.warn(
        `Stripe price ${stripePriceId} (plan "${plan.key}", interval "${price.interval}") no longer exists — deactivated locally`,
      );
      this.telemetry.captureMessage(
        `Stripe price missing for plan "${plan.key}" — deactivated locally`,
        "warn",
        {
          module: "subscriptions",
          code: "PLAN_CATALOG_PRICE_MISSING",
          planKey: plan.key,
          interval: price.interval,
          stripePriceId,
        },
      );
      return;
    }

    // A Stripe Price is never deleted, only archived (`active: false`) — this
    // is the normal, common way a price gets retired from the dashboard,
    // unlike the `retrievePrice() === null` case above (bogus/foreign id,
    // rare). It must go through the exact same `deactivateById` path (clears
    // `lookupKey` per migration 0048's partial unique index) instead of a
    // plain `updateById({ active: false })` — otherwise a later
    // `SyncPlanCatalogUseCase.createOrAdoptPrice` for the same lookup_key
    // would collide with this still-"owning" row. Money/currency are not
    // corrected on a row that is being retired in the same pass.
    if (stripePrice.active === false && price.active) {
      results.push({
        planKey: plan.key,
        interval: price.interval,
        field: "active",
        oldValue: "true",
        newValue: "false",
      });
      await this.billingPlanPriceRepo.deactivateById(price.id);
      this.logger.warn(
        `Stripe price ${stripePriceId} (plan "${plan.key}", interval "${price.interval}") is archived in Stripe — deactivated locally`,
      );
      this.telemetry.captureMessage(
        `Stripe price archived for plan "${plan.key}" — deactivated locally`,
        "warn",
        {
          module: "subscriptions",
          code: "PLAN_CATALOG_PRICE_ARCHIVED",
          planKey: plan.key,
          interval: price.interval,
          stripePriceId,
        },
      );
      return;
    }

    const patch: Partial<
      Omit<BillingPlanPriceEntity, "id" | "planId" | "createdAt">
    > = {};

    if (
      stripePrice.unitAmount !== null &&
      stripePrice.unitAmount !== price.amountCents
    ) {
      results.push({
        planKey: plan.key,
        interval: price.interval,
        field: "amountCents",
        oldValue: String(price.amountCents),
        newValue: String(stripePrice.unitAmount),
      });
      // Money being changed automatically, without human supervision — must
      // stay rastreável (logger.warn + telemetry), not just a silent write.
      this.logger.warn(
        `Price drift auto-corrected from Stripe for plan "${plan.key}" (${price.interval}): amountCents ${price.amountCents} -> ${stripePrice.unitAmount}`,
      );
      this.telemetry.captureMessage(
        `Plan price amount auto-corrected from Stripe for plan "${plan.key}"`,
        "warn",
        {
          module: "subscriptions",
          code: "PLAN_CATALOG_PRICE_AMOUNT_CORRECTED",
          planKey: plan.key,
          interval: price.interval,
          oldAmountCents: price.amountCents,
          newAmountCents: stripePrice.unitAmount,
        },
      );
      patch.amountCents = stripePrice.unitAmount;
    }

    if (stripePrice.currency !== price.currency) {
      results.push({
        planKey: plan.key,
        interval: price.interval,
        field: "currency",
        oldValue: price.currency,
        newValue: stripePrice.currency,
      });
      patch.currency = stripePrice.currency;
    }

    // Only remaining `active` divergence at this point is a reactivation
    // (Stripe reports `active: true` for a row we hold as `active: false`)
    // — the `active: false` retirement case was handled above via
    // `deactivateById` and already returned.
    if (stripePrice.active !== price.active) {
      results.push({
        planKey: plan.key,
        interval: price.interval,
        field: "active",
        oldValue: String(price.active),
        newValue: String(stripePrice.active),
      });
      patch.active = stripePrice.active;
    }

    if (Object.keys(patch).length > 0) {
      await this.billingPlanPriceRepo.updateById(price.id, patch);
    }
  }
}
