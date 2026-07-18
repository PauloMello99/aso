import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { OrgsInfrastructureModule } from "../organizations/infrastructure/orgs-infrastructure.module";
import { SubscriptionsInfrastructureModule } from "./infrastructure/subscriptions-infrastructure.module";
import { CreateCheckoutSessionUseCase } from "./application/use-cases/create-checkout-session.use-case";
import { CreatePortalSessionUseCase } from "./application/use-cases/create-portal-session.use-case";
import { GetSubscriptionUseCase } from "./application/use-cases/get-subscription.use-case";
import { HandleStripeWebhookUseCase } from "./application/use-cases/handle-stripe-webhook.use-case";
import { EntitlementsService } from "./application/entitlements.service";
import { SubscriptionsController } from "./interface/subscriptions.controller";
import { StripeWebhookController } from "./interface/stripe-webhook.controller";
import { ActiveSubscriptionGuard } from "./interface/guards/active-subscription.guard";

@Module({
  imports: [SubscriptionsInfrastructureModule, AuthModule, OrgsInfrastructureModule],
  controllers: [SubscriptionsController, StripeWebhookController],
  providers: [
    CreateCheckoutSessionUseCase,
    CreatePortalSessionUseCase,
    GetSubscriptionUseCase,
    HandleStripeWebhookUseCase,
    EntitlementsService,
    ActiveSubscriptionGuard,
  ],
  exports: [EntitlementsService, ActiveSubscriptionGuard],
})
export class SubscriptionsModule {}
