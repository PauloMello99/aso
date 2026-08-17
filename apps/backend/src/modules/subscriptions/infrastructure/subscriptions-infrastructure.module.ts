import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../../database/database.module";
import { PAYMENT_GATEWAY } from "../domain/ports/payment-gateway.port";
import { SUBSCRIPTION_REPOSITORY } from "../domain/subscription.repository.interface";
import { BILLING_PLAN_REPOSITORY } from "../domain/billing-plan.repository.interface";
import { STRIPE_WEBHOOK_EVENT_REPOSITORY } from "../domain/stripe-webhook-event.repository.interface";
import { BILLING_INVOICE_EVENT_REPOSITORY } from "../domain/billing-invoice-event.repository.interface";
import { BILLING_COUPON_REPOSITORY } from "../domain/billing-coupon.repository.interface";
import { BILLING_PLAN_PRICE_REPOSITORY } from "../domain/billing-plan-price.repository.interface";
import { StripePaymentGateway } from "./stripe-payment-gateway";
import { DrizzleSubscriptionRepository } from "./persistence/drizzle-subscription.repository";
import { DrizzleBillingPlanRepository } from "./persistence/drizzle-billing-plan.repository";
import { DrizzleStripeWebhookEventRepository } from "./persistence/drizzle-stripe-webhook-event.repository";
import { DrizzleBillingInvoiceEventRepository } from "./persistence/drizzle-billing-invoice-event.repository";
import { DrizzleBillingCouponRepository } from "./persistence/drizzle-billing-coupon.repository";
import { DrizzleBillingPlanPriceRepository } from "./persistence/drizzle-billing-plan-price.repository";
import { PlanCatalogService } from "../application/plan-catalog.service";
import { SyncPlanCatalogUseCase } from "../application/use-cases/sync-plan-catalog.use-case";

@Module({
  imports: [DatabaseModule],
  providers: [
    { provide: PAYMENT_GATEWAY, useClass: StripePaymentGateway },
    { provide: SUBSCRIPTION_REPOSITORY, useClass: DrizzleSubscriptionRepository },
    { provide: BILLING_PLAN_REPOSITORY, useClass: DrizzleBillingPlanRepository },
    {
      provide: STRIPE_WEBHOOK_EVENT_REPOSITORY,
      useClass: DrizzleStripeWebhookEventRepository,
    },
    {
      provide: BILLING_INVOICE_EVENT_REPOSITORY,
      useClass: DrizzleBillingInvoiceEventRepository,
    },
    {
      provide: BILLING_COUPON_REPOSITORY,
      useClass: DrizzleBillingCouponRepository,
    },
    {
      provide: BILLING_PLAN_PRICE_REPOSITORY,
      useClass: DrizzleBillingPlanPriceRepository,
    },
    SyncPlanCatalogUseCase,
    PlanCatalogService,
  ],
  exports: [
    PAYMENT_GATEWAY,
    SUBSCRIPTION_REPOSITORY,
    BILLING_PLAN_REPOSITORY,
    STRIPE_WEBHOOK_EVENT_REPOSITORY,
    BILLING_INVOICE_EVENT_REPOSITORY,
    BILLING_COUPON_REPOSITORY,
    BILLING_PLAN_PRICE_REPOSITORY,
    SyncPlanCatalogUseCase,
    PlanCatalogService,
  ],
})
export class SubscriptionsInfrastructureModule {}
