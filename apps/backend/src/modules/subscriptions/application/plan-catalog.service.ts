import { Inject, Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { PLAN_CATALOG } from "../domain/plan-catalog";
import {
  IPaymentGateway,
  PAYMENT_GATEWAY,
} from "../domain/ports/payment-gateway.port";
import {
  BILLING_PLAN_REPOSITORY,
  IBillingPlanRepository,
} from "../domain/billing-plan.repository.interface";

/**
 * On boot, ensures every entry in PLAN_CATALOG has a corresponding Stripe
 * product/price and a synced row in billing_plans. Never throws: a Stripe
 * outage at boot must not prevent the application from starting.
 */
@Injectable()
export class PlanCatalogService implements OnModuleInit {
  private readonly logger = new Logger(PlanCatalogService.name);

  constructor(
    @Inject(PAYMENT_GATEWAY) private readonly gateway: IPaymentGateway,
    @Inject(BILLING_PLAN_REPOSITORY)
    private readonly billingPlanRepo: IBillingPlanRepository,
  ) {}

  async onModuleInit(): Promise<void> {
    for (const entry of PLAN_CATALOG) {
      try {
        const existing = await this.gateway.findPriceByLookupKey(
          entry.lookupKey,
        );
        const { productId } = await this.gateway.ensureProduct({
          id: entry.productKey,
          name: entry.name,
        });

        let price: { priceId: string; productId: string };
        if (!existing) {
          const { priceId } = await this.gateway.createPrice({
            productId,
            amountCents: entry.priceCents,
            currency: entry.currency,
            interval: entry.interval,
            lookupKey: entry.lookupKey,
          });
          price = { priceId, productId };
        } else if (existing.unitAmount !== entry.priceCents) {
          // Price changed in the catalog: Stripe prices are immutable, so mint
          // a new price and transfer the lookup_key from the stale one onto it.
          this.logger.log(
            `Rotating price for "${entry.key}" (${existing.unitAmount} → ${entry.priceCents})`,
          );
          const { priceId } = await this.gateway.createPrice({
            productId,
            amountCents: entry.priceCents,
            currency: entry.currency,
            interval: entry.interval,
            lookupKey: entry.lookupKey,
            transferLookupKey: true,
          });
          price = { priceId, productId };
        } else {
          price = { priceId: existing.priceId, productId };
        }

        await this.billingPlanRepo.upsert({
          key: entry.key,
          stripeProductId: price.productId,
          stripePriceId: price.priceId,
          name: entry.name,
          amountCents: entry.priceCents,
          currency: entry.currency,
          interval: entry.interval,
          active: true,
          lastSyncedAt: new Date(),
        });
      } catch (error) {
        this.logger.error(
          `Failed to sync plan catalog entry "${entry.key}" with Stripe`,
          error instanceof Error ? error.stack : String(error),
        );
      }
    }
  }
}
