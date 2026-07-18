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
        let price = await this.gateway.findPriceByLookupKey(entry.lookupKey);

        if (!price) {
          const { productId } = await this.gateway.ensureProduct({
            name: entry.name,
          });
          const { priceId } = await this.gateway.createPrice({
            productId,
            amountCents: entry.priceCents,
            currency: entry.currency,
            interval: entry.interval,
            lookupKey: entry.lookupKey,
          });
          price = { priceId, productId };
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
