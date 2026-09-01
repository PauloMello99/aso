import { Inject, Injectable, Logger } from "@nestjs/common";
import {
  ISubscriptionRepository,
  SUBSCRIPTION_REPOSITORY,
} from "../domain/subscription.repository.interface";
import {
  IBillingRefundEventRepository,
  BILLING_REFUND_EVENT_REPOSITORY,
} from "../domain/billing-refund-event.repository.interface";
import {
  IPaymentGateway,
  PAYMENT_GATEWAY,
} from "../domain/ports/payment-gateway.port";

/**
 * Resolves a refund's org, server-side only, cheapest source first:
 * (a) the charge's customer (when known) -> local subscription;
 * (b) an org already mirrored for this `stripe_refund_id`;
 * (c) an org already mirrored for this `stripe_charge_id`;
 * (d) a `charges.retrieve` round-trip for the customer -> local subscription;
 * (e) a `paymentIntents.retrieve` round-trip -> local subscription, only when
 *     (d) did not already produce a customer (a payment intent and its charge
 *     share the same customer, so this is not a retry of (d)). It exists for
 *     the `refund.updated` payload whose `charge` is `null` but which still
 *     carries a `payment_intent`.
 * Returns `null` when every source comes up empty — never throws (a Stripe
 * failure in step (d) or (e) is swallowed so the webhook is not driven into a
 * retry loop by an unresolvable org).
 *
 * Extracted from `HandleStripeWebhookUseCase` so the same ladder backs
 * `ReconcileRefundsUseCase` (the global refund scan). Emits NO telemetry:
 * `BILLING_REFUND_EVENT_ORG_UNRESOLVED` stays in the caller
 * (`HandleStripeWebhookUseCase.writeRefundRow`), which knows a row is being
 * written unattributed.
 */
@Injectable()
export class RefundOrgResolver {
  private readonly logger = new Logger(RefundOrgResolver.name);

  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY)
    private readonly subscriptionRepo: ISubscriptionRepository,
    @Inject(BILLING_REFUND_EVENT_REPOSITORY)
    private readonly refundEventRepo: IBillingRefundEventRepository,
    @Inject(PAYMENT_GATEWAY)
    private readonly paymentGateway: IPaymentGateway,
  ) {}

  async resolve(input: {
    refundId: string;
    chargeId: string | null;
    customerId: string | null;
    paymentIntentId?: string | null;
  }): Promise<string | null> {
    if (input.customerId !== null) {
      const local = await this.subscriptionRepo.findByStripeCustomerId(
        input.customerId,
      );
      if (local) return local.orgId;
    }

    const byRefund = await this.refundEventRepo.findResolvedOrgIdByRefundId(
      input.refundId,
    );
    if (byRefund != null) return byRefund;

    // Whether step (d)'s `charges.retrieve` already yielded a customer. When it
    // did, step (e) would resolve the same customer (a payment intent and its
    // charge share one) and add nothing but a Stripe round-trip.
    let chargeYieldedCustomer = false;

    if (input.chargeId !== null) {
      const byCharge = await this.refundEventRepo.findResolvedOrgIdByChargeId(
        input.chargeId,
      );
      if (byCharge != null) return byCharge;

      try {
        const customerId = await this.paymentGateway.retrieveChargeCustomerId(
          input.chargeId,
        );
        if (customerId != null) {
          chargeYieldedCustomer = true;
          const local =
            await this.subscriptionRepo.findByStripeCustomerId(customerId);
          if (local) return local.orgId;
        }
      } catch (error) {
        this.logger.warn(
          `refund org resolution: charges.retrieve for ${input.chargeId} failed (${
            error instanceof Error ? error.message : "unknown error"
          }) — leaving the refund row unattributed`,
        );
      }
    }

    if (!chargeYieldedCustomer && input.paymentIntentId != null) {
      try {
        const customerId =
          await this.paymentGateway.retrievePaymentIntentCustomerId(
            input.paymentIntentId,
          );
        if (customerId != null) {
          const local =
            await this.subscriptionRepo.findByStripeCustomerId(customerId);
          if (local) return local.orgId;
        }
      } catch (error) {
        this.logger.warn(
          `refund org resolution: paymentIntents.retrieve for ${input.paymentIntentId} failed (${
            error instanceof Error ? error.message : "unknown error"
          }) — leaving the refund row unattributed`,
        );
      }
    }

    return null;
  }
}
