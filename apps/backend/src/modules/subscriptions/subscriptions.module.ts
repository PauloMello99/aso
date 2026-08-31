import { Module } from "@nestjs/common";
import { CronJobStateModule } from "../../common/cron/cron-job-state.module";
import { AuthModule } from "../auth/auth.module";
import { OrgsInfrastructureModule } from "../organizations/infrastructure/orgs-infrastructure.module";
import { UserInfrastructureModule } from "../user/infrastructure/user-infrastructure.module";
import { SubscriptionsInfrastructureModule } from "./infrastructure/subscriptions-infrastructure.module";
import { FrontendRevalidationClient } from "./infrastructure/frontend-revalidation.client";
import { CreateCheckoutSessionUseCase } from "./application/use-cases/create-checkout-session.use-case";
import { CreatePortalSessionUseCase } from "./application/use-cases/create-portal-session.use-case";
import { GetSubscriptionUseCase } from "./application/use-cases/get-subscription.use-case";
import { HandleStripeWebhookUseCase } from "./application/use-cases/handle-stripe-webhook.use-case";
import { ReconcileSubscriptionsUseCase } from "./application/use-cases/reconcile-subscriptions.use-case";
import { ExpireSubscriptionsUseCase } from "./application/use-cases/expire-subscriptions.use-case";
import { ReconcilePlanCatalogUseCase } from "./application/use-cases/reconcile-plan-catalog.use-case";
import { GrantCompUseCase } from "./application/use-cases/grant-comp.use-case";
import { ScheduleSubscriptionCancellationUseCase } from "./application/use-cases/schedule-subscription-cancellation.use-case";
import { ResumeSubscriptionUseCase } from "./application/use-cases/resume-subscription.use-case";
import { RevokeCompUseCase } from "./application/use-cases/revoke-comp.use-case";
import { ApplyDiscountUseCase } from "./application/use-cases/apply-discount.use-case";
import { RemoveDiscountUseCase } from "./application/use-cases/remove-discount.use-case";
import { ListSubscriptionInvoicesUseCase } from "./application/use-cases/list-subscription-invoices.use-case";
import { ListBillingPlansUseCase } from "./application/use-cases/list-billing-plans.use-case";
import { ListPublicBillingPlansUseCase } from "./application/use-cases/list-public-billing-plans.use-case";
import { UpdateBillingPlanProductUseCase } from "./application/use-cases/update-billing-plan-product.use-case";
import { RotatePlanIntervalPriceUseCase } from "./application/use-cases/rotate-plan-interval-price.use-case";
import { PlanPriceLinkageService } from "./application/plan-price-linkage.service";
import { UpsertPlanIntervalPriceUseCase } from "./application/use-cases/upsert-plan-interval-price.use-case";
import { SetPlanIntervalActiveUseCase } from "./application/use-cases/set-plan-interval-active.use-case";
import { MigrateSubscribersToPriceUseCase } from "./application/use-cases/migrate-subscribers-to-price.use-case";
import { CreateBillingCouponUseCase } from "./application/use-cases/create-billing-coupon.use-case";
import { ListBillingCouponsUseCase } from "./application/use-cases/list-billing-coupons.use-case";
import { UpdateBillingCouponUseCase } from "./application/use-cases/update-billing-coupon.use-case";
import { EntitlementsService } from "./application/entitlements.service";
import { SubscriptionsController } from "./interface/subscriptions.controller";
import { StripeWebhookController } from "./interface/stripe-webhook.controller";
import { AdminSubscriptionController } from "./interface/admin-subscription.controller";
import { AdminBillingController } from "./interface/admin-billing.controller";
import { PublicBillingController } from "./interface/public-billing.controller";
import { ActiveSubscriptionGuard } from "./interface/guards/active-subscription.guard";
import { PublicBillingFeatureFlagGuard } from "./interface/public-billing-feature-flag.guard";

@Module({
  imports: [
    SubscriptionsInfrastructureModule,
    AuthModule,
    OrgsInfrastructureModule,
    UserInfrastructureModule,
    CronJobStateModule,
  ],
  controllers: [
    SubscriptionsController,
    StripeWebhookController,
    AdminSubscriptionController,
    AdminBillingController,
    PublicBillingController,
  ],
  providers: [
    FrontendRevalidationClient,
    CreateCheckoutSessionUseCase,
    CreatePortalSessionUseCase,
    GetSubscriptionUseCase,
    HandleStripeWebhookUseCase,
    ReconcileSubscriptionsUseCase,
    ExpireSubscriptionsUseCase,
    ReconcilePlanCatalogUseCase,
    GrantCompUseCase,
    ScheduleSubscriptionCancellationUseCase,
    ResumeSubscriptionUseCase,
    RevokeCompUseCase,
    ApplyDiscountUseCase,
    RemoveDiscountUseCase,
    ListSubscriptionInvoicesUseCase,
    ListBillingPlansUseCase,
    ListPublicBillingPlansUseCase,
    UpdateBillingPlanProductUseCase,
    RotatePlanIntervalPriceUseCase,
    PlanPriceLinkageService,
    UpsertPlanIntervalPriceUseCase,
    SetPlanIntervalActiveUseCase,
    MigrateSubscribersToPriceUseCase,
    CreateBillingCouponUseCase,
    ListBillingCouponsUseCase,
    UpdateBillingCouponUseCase,
    EntitlementsService,
    ActiveSubscriptionGuard,
    PublicBillingFeatureFlagGuard,
  ],
  exports: [
    EntitlementsService,
    ActiveSubscriptionGuard,
    ReconcileSubscriptionsUseCase,
    ExpireSubscriptionsUseCase,
    ReconcilePlanCatalogUseCase,
  ],
})
export class SubscriptionsModule {}
