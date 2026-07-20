import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { OrgsInfrastructureModule } from "../organizations/infrastructure/orgs-infrastructure.module";
import { UserInfrastructureModule } from "../user/infrastructure/user-infrastructure.module";
import { SubscriptionsInfrastructureModule } from "./infrastructure/subscriptions-infrastructure.module";
import { CreateCheckoutSessionUseCase } from "./application/use-cases/create-checkout-session.use-case";
import { CreatePortalSessionUseCase } from "./application/use-cases/create-portal-session.use-case";
import { GetSubscriptionUseCase } from "./application/use-cases/get-subscription.use-case";
import { HandleStripeWebhookUseCase } from "./application/use-cases/handle-stripe-webhook.use-case";
import { ReconcileSubscriptionsUseCase } from "./application/use-cases/reconcile-subscriptions.use-case";
import { ExpireSubscriptionsUseCase } from "./application/use-cases/expire-subscriptions.use-case";
import { GrantCompUseCase } from "./application/use-cases/grant-comp.use-case";
import { RevokeCompUseCase } from "./application/use-cases/revoke-comp.use-case";
import { ApplyDiscountUseCase } from "./application/use-cases/apply-discount.use-case";
import { RemoveDiscountUseCase } from "./application/use-cases/remove-discount.use-case";
import { ListSubscriptionInvoicesUseCase } from "./application/use-cases/list-subscription-invoices.use-case";
import { EntitlementsService } from "./application/entitlements.service";
import { SubscriptionsController } from "./interface/subscriptions.controller";
import { StripeWebhookController } from "./interface/stripe-webhook.controller";
import { AdminSubscriptionController } from "./interface/admin-subscription.controller";
import { ActiveSubscriptionGuard } from "./interface/guards/active-subscription.guard";

@Module({
  imports: [
    SubscriptionsInfrastructureModule,
    AuthModule,
    OrgsInfrastructureModule,
    UserInfrastructureModule,
  ],
  controllers: [
    SubscriptionsController,
    StripeWebhookController,
    AdminSubscriptionController,
  ],
  providers: [
    CreateCheckoutSessionUseCase,
    CreatePortalSessionUseCase,
    GetSubscriptionUseCase,
    HandleStripeWebhookUseCase,
    ReconcileSubscriptionsUseCase,
    ExpireSubscriptionsUseCase,
    GrantCompUseCase,
    RevokeCompUseCase,
    ApplyDiscountUseCase,
    RemoveDiscountUseCase,
    ListSubscriptionInvoicesUseCase,
    EntitlementsService,
    ActiveSubscriptionGuard,
  ],
  exports: [
    EntitlementsService,
    ActiveSubscriptionGuard,
    ReconcileSubscriptionsUseCase,
    ExpireSubscriptionsUseCase,
  ],
})
export class SubscriptionsModule {}
