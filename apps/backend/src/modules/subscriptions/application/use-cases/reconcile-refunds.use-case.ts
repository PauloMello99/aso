import { Inject, Injectable, Logger } from "@nestjs/common";
import { CRON_JOBS } from "../../../../common/cron/cron-jobs";
import {
  CRON_JOB_STATE_REPOSITORY,
  ICronJobStateRepository,
} from "../../../../common/cron/cron-job-state.repository.interface";
import { TelemetryService } from "../../../../common/telemetry/telemetry.service";
import {
  GatewayRefund,
  IPaymentGateway,
  PAYMENT_GATEWAY,
} from "../../domain/ports/payment-gateway.port";
import {
  BILLING_REFUND_EVENT_REPOSITORY,
  BillingRefundEventStatus,
  IBillingRefundEventRepository,
} from "../../domain/billing-refund-event.repository.interface";
import {
  ISubscriptionRepository,
  SUBSCRIPTION_REPOSITORY,
} from "../../domain/subscription.repository.interface";
import { toRefundEventStatus } from "../../domain/refund-event-status";
import { RefundOrgResolver } from "../refund-org-resolver.service";

export interface ReconcileRefundsResult {
  skipped: boolean;
  scanned: number;
  written: number;
  siblingBackfilled: number;
  orphansResolved: number;
  errors: number;
  skippedForeign: number;
}

const JOB_NAME: string = CRON_JOBS.BILLING_REFUND_RECONCILIATION;
const MIN_INTERVAL_MS = 24 * 60 * 60 * 1000;
// A 7-day look-back with slack over the 24h interval, so a couple of missed
// ticks still cannot let a refund fall out of the window unmirrored.
const SCAN_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const ORPHAN_BATCH = 200;
// Pass 2 only re-resolves orphans this recent. A multiple of SCAN_WINDOW_MS:
// an orphan older than 30 days has already had ~4 scan windows of resolution
// attempts, so it is almost certainly permanently irresolvable (shared Stripe
// account, or a customer with no local subscription) and would otherwise sit
// at the head of every ORPHAN_BATCH forever, starving newer orphans.
const ORPHAN_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Periodic safety net for missed/delayed Stripe refund webhooks
 * (`charge.refunded` / `refund.updated`): a global scan of every refund
 * created in the last `SCAN_WINDOW_MS`, mirrored into `billing_refund_events`
 * with the same whitelist (`toRefundEventStatus`) and org-resolution ladder
 * (`RefundOrgResolver`) as `HandleStripeWebhookUseCase`. A second pass
 * re-resolves rows still stuck at `org_id IS NULL`.
 *
 * Self-throttled to at most once every `MIN_INTERVAL_MS` via an atomic DB
 * claim (`ICronJobStateRepository.claimRun`), not a Nest `@Cron` schedule —
 * invoked on every `POST /internal/cron/tick` like the other jobs, but most
 * calls are a cheap no-op claim check.
 *
 * Append-only, per migration 0060: `create` uses
 * `onConflictDoNothing (stripe_refund_id, status)`, and the orphan pass only
 * ever backfills a `NULL` `org_id` (T4-F5 decision D4) — never `status`,
 * `amount_cents`, `occurred_at` or `reason`.
 */
@Injectable()
export class ReconcileRefundsUseCase {
  private readonly logger = new Logger(ReconcileRefundsUseCase.name);

  constructor(
    @Inject(CRON_JOB_STATE_REPOSITORY)
    private readonly cronJobStateRepo: ICronJobStateRepository,
    @Inject(PAYMENT_GATEWAY)
    private readonly paymentGateway: IPaymentGateway,
    @Inject(BILLING_REFUND_EVENT_REPOSITORY)
    private readonly refundEventRepo: IBillingRefundEventRepository,
    @Inject(SUBSCRIPTION_REPOSITORY)
    private readonly subscriptionRepo: ISubscriptionRepository,
    private readonly refundOrgResolver: RefundOrgResolver,
    private readonly telemetry: TelemetryService,
  ) {}

  async execute(): Promise<ReconcileRefundsResult> {
    const now = new Date();
    const claimed = await this.cronJobStateRepo.claimRun(
      JOB_NAME,
      now,
      MIN_INTERVAL_MS,
    );
    if (!claimed) {
      return {
        skipped: true,
        scanned: 0,
        written: 0,
        siblingBackfilled: 0,
        orphansResolved: 0,
        errors: 0,
        skippedForeign: 0,
      };
    }

    let written = 0;
    let errors = 0;
    let skippedForeign = 0;

    // Pass 1 — global scan.
    const since = new Date(now.getTime() - SCAN_WINDOW_MS);
    const { refunds, truncated } =
      await this.paymentGateway.listRefundsCreatedSince(since);

    if (truncated) {
      this.logger.warn(
        `Refund reconciliation scan hit its ceiling before exhausting the window — the oldest refunds since ${since.toISOString()} were not returned`,
      );
      this.telemetry.captureMessage(
        "Refund reconciliation global scan was truncated before exhausting the look-back window",
        "warn",
        {
          module: "subscriptions",
          code: "BILLING_REFUND_RECONCILE_SCAN_TRUNCATED",
        },
      );
    }

    const statusesByRefund = await this.refundEventRepo.findStatusesByRefundIds(
      refunds.map((refund) => refund.refundId),
    );

    // Memoizes ONLY the org-resolution ladder result, keyed by charge, for the
    // span of this run (not persistent). Several refunds of the same charge —
    // routine on a shared Stripe account, where every foreign refund in the 7d
    // window would otherwise cost one `charges.retrieve` per tick forever —
    // then share a single `RefundOrgResolver.resolve` call. The per-refund
    // insertion guard (`seen.length === 0 && orgId === null`) is still
    // evaluated for every refund.
    const orgByCharge = new Map<string, string | null>();

    for (const refund of refunds) {
      try {
        const outcome = await this.reconcileRefund(
          refund,
          statusesByRefund,
          orgByCharge,
        );
        if (outcome === "written") written += 1;
        else if (outcome === "skipped-foreign") skippedForeign += 1;
      } catch (error) {
        errors += 1;
        this.logger.error(
          `Failed to reconcile refund ${refund.refundId} against billing_refund_events`,
          error instanceof Error ? error.stack : String(error),
        );
        this.telemetry.captureMessage(
          `Refund reconciliation failed for refund ${refund.refundId}`,
          "warn",
          {
            module: "subscriptions",
            code: "BILLING_REFUND_RECONCILE_FAILED",
            stripeRefundId: refund.refundId,
            error: error instanceof Error ? error.message : String(error),
          },
        );
      }
    }

    // Pass 2 — re-resolution of orphans (rows still at org_id IS NULL).
    // First, a set-based backfill of rows whose org was resolved on a sibling
    // status row of the SAME refund. `listUnresolvedChargeIds` deliberately
    // skips those (resolved sibling), so `reconcileOrphanCharge` would never
    // reach them and a `pending`/`org_id NULL` row would stay orphaned
    // forever. T4-F5 decision D4: fills a NULL `org_id` only.
    const siblingBackfilled =
      await this.refundEventRepo.backfillOrgIdFromResolvedSiblings();
    if (siblingBackfilled > 0) {
      this.logger.log(
        `Refund reconciliation backfilled org_id onto ${siblingBackfilled} orphan refund row(s) from a resolved sibling of the same refund`,
      );
      this.telemetry.captureMessage(
        `Refund reconciliation backfilled org_id on ${siblingBackfilled} orphan refund row(s) from a resolved sibling`,
        "warn",
        {
          module: "subscriptions",
          code: "BILLING_REFUND_ORPHAN_SIBLING_BACKFILL",
          rowsAffected: siblingBackfilled,
        },
      );
    }

    const orphanSince = new Date(now.getTime() - ORPHAN_WINDOW_MS);
    const orphanChargeIds = await this.refundEventRepo.listUnresolvedChargeIds(
      ORPHAN_BATCH,
      orphanSince,
    );
    let orphansResolved = 0;

    for (const chargeId of orphanChargeIds) {
      try {
        orphansResolved += await this.reconcileOrphanCharge(chargeId);
      } catch (error) {
        errors += 1;
        this.logger.error(
          `Failed to re-resolve orphan refund rows for charge ${chargeId}`,
          error instanceof Error ? error.stack : String(error),
        );
        this.telemetry.captureMessage(
          `Refund reconciliation failed while re-resolving orphan rows for charge ${chargeId}`,
          "warn",
          {
            module: "subscriptions",
            code: "BILLING_REFUND_RECONCILE_FAILED",
            stripeChargeId: chargeId,
            error: error instanceof Error ? error.message : String(error),
          },
        );
      }
    }

    this.logger.log(
      `Refund reconciliation complete: scanned=${refunds.length} written=${written} siblingBackfilled=${siblingBackfilled} orphansResolved=${orphansResolved} skippedForeign=${skippedForeign} errors=${errors}`,
    );

    return {
      skipped: false,
      scanned: refunds.length,
      written,
      siblingBackfilled,
      orphansResolved,
      errors,
      skippedForeign,
    };
  }

  private async reconcileRefund(
    refund: GatewayRefund,
    statusesByRefund: Map<string, BillingRefundEventStatus[]>,
    orgByCharge: Map<string, string | null>,
  ): Promise<"written" | "skipped-foreign" | "noop"> {
    const seen = statusesByRefund.get(refund.refundId) ?? [];

    const mappedStatus = toRefundEventStatus(refund.status);
    if (mappedStatus === null) {
      this.logger.warn(
        `refund ${refund.refundId} has an unmapped status "${refund.status}" — skipping this refund`,
      );
      this.telemetry.captureMessage(
        `Stripe refund ${refund.refundId} has a status not mapped by the reverse sync`,
        "warn",
        {
          module: "subscriptions",
          code: "BILLING_REFUND_EVENT_UNKNOWN_STATUS",
          stripeRefundId: refund.refundId,
          status: refund.status,
        },
      );
      return "noop";
    }

    if (seen.includes(mappedStatus)) {
      // This transition is already mirrored locally — nothing to do. Checked
      // BEFORE resolving the org: `RefundOrgResolver.resolve` can spend a
      // `charges.retrieve` per refund, and the scan ceiling is 2000.
      return "noop";
    }

    // Insertion guard (T4-F5 decision D3b — the Stripe account can be shared
    // with other products): a refund we have never seen locally
    // (`seen.length === 0`) is only mirrored when its org resolves to a
    // `stripe_customer_id` we know. A refund that already has a local row is
    // ours regardless — mirror the new transition unattributed if need be.
    //
    // The resolution ladder is memoized per charge for this run: N refunds of
    // one charge trigger a single `resolve` (hence at most one
    // `charges.retrieve`) instead of N. Refunds with no `chargeId` are never
    // memoized — the key would be ambiguous — so each resolves on its own.
    let orgId: string | null;
    if (refund.chargeId !== null && orgByCharge.has(refund.chargeId)) {
      orgId = orgByCharge.get(refund.chargeId) ?? null;
    } else {
      orgId = await this.refundOrgResolver.resolve({
        refundId: refund.refundId,
        chargeId: refund.chargeId,
        customerId: null,
      });
      if (refund.chargeId !== null) {
        orgByCharge.set(refund.chargeId, orgId);
      }
    }

    if (seen.length === 0 && orgId === null) {
      // No local row and no resolvable org — almost certainly a refund on a
      // charge belonging to another product on this Stripe account. Not
      // emitted per-refund (noise at the 2000-refund ceiling); only counted.
      return "skipped-foreign";
    }

    // On the reconciliation path there is no webhook envelope, so `occurred_at`
    // is approximated by `refund.createdAt` (Stripe's `refund.created`) —
    // unlike the webhook path, which stamps it from `event.created` (migration
    // 0060 note (a)). The `(stripe_refund_id, status)` uniqueness keeps this
    // idempotent across runs.
    await this.refundEventRepo.create({
      stripeRefundId: refund.refundId,
      stripeChargeId: refund.chargeId,
      orgId,
      status: mappedStatus,
      amountCents: refund.amountCents,
      currency: refund.currency,
      reason: refund.reason,
      occurredAt: refund.createdAt,
    });

    // A monetary row written automatically, without human supervision — must
    // stay rastreável (logger.warn + telemetry), like every automatic monetary
    // write in ReconcilePlanCatalogUseCase.
    this.logger.warn(
      `Refund reconciliation mirrored refund ${refund.refundId} (${mappedStatus}, ${refund.amountCents} ${refund.currency}) for org ${orgId ?? "unresolved"}`,
    );
    this.telemetry.captureMessage(
      `Refund reconciliation wrote a billing_refund_events row for refund ${refund.refundId}`,
      "warn",
      {
        module: "subscriptions",
        code: "BILLING_REFUND_RECONCILE_ROW_WRITTEN",
        stripeRefundId: refund.refundId,
        status: mappedStatus,
        amountCents: refund.amountCents,
        currency: refund.currency,
        orgId,
      },
    );

    return "written";
  }

  private async reconcileOrphanCharge(chargeId: string): Promise<number> {
    const customerId =
      await this.paymentGateway.retrieveChargeCustomerId(chargeId);
    if (customerId == null) return 0;

    const sub = await this.subscriptionRepo.findByStripeCustomerId(customerId);
    if (!sub) return 0;

    const affected = await this.refundEventRepo.resolveOrgIdWhereNull(
      chargeId,
      sub.orgId,
    );
    if (affected > 0) {
      this.logger.warn(
        `Refund reconciliation backfilled org ${sub.orgId} onto ${affected} orphan refund row(s) for charge ${chargeId}`,
      );
      this.telemetry.captureMessage(
        `Refund reconciliation backfilled org_id on ${affected} orphan refund row(s)`,
        "warn",
        {
          module: "subscriptions",
          code: "BILLING_REFUND_ORPHAN_RESOLVED",
          stripeChargeId: chargeId,
          orgId: sub.orgId,
          rowsAffected: affected,
        },
      );
    }
    return affected;
  }
}
