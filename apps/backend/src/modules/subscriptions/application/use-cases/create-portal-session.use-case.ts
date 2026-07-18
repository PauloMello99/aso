import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  ISubscriptionRepository,
  SUBSCRIPTION_REPOSITORY,
} from "../../domain/subscription.repository.interface";
import {
  IPaymentGateway,
  PAYMENT_GATEWAY,
} from "../../domain/ports/payment-gateway.port";
import {
  IOrganizationRepository,
  ORGANIZATION_REPOSITORY,
} from "../../../organizations/domain/org.repository.interface";
import { SubscriptionNotFoundException } from "../../domain/exceptions/subscription-not-found.exception";
import { SubscriptionNotStripeLinkedException } from "../../domain/exceptions/subscription-not-stripe-linked.exception";

@Injectable()
export class CreatePortalSessionUseCase {
  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY)
    private readonly subscriptionRepo: ISubscriptionRepository,
    @Inject(PAYMENT_GATEWAY)
    private readonly paymentGateway: IPaymentGateway,
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly orgRepo: IOrganizationRepository,
    private readonly config: ConfigService,
  ) {}

  async execute(
    orgId: string,
    actorUserId: string,
  ): Promise<{ url: string }> {
    const subscription = await this.subscriptionRepo.findByOrgId(orgId);
    if (!subscription) throw new SubscriptionNotFoundException(orgId);

    // Portal only makes sense for a subscription fully linked to Stripe
    // (customer AND subscription created) — not for comp/trial-only rows
    // that never reached Stripe, nor for the brief mid-checkout window
    // where a customer exists but the subscription hasn't materialized yet.
    if (!subscription.isStripeLinked || !subscription.stripeCustomerId) {
      throw new SubscriptionNotStripeLinkedException(orgId);
    }

    // `actorUserId` here is the Supabase authId (as forwarded by controllers
    // from `AuthUser.id`), so it resolves against auth-keyed repo methods.
    const org = await this.orgRepo.findByIdAndAuthId(orgId, actorUserId);
    if (!org) throw new SubscriptionNotFoundException(orgId);

    const frontendUrl = this.config.getOrThrow<string>("FRONTEND_URL");
    const returnUrl = `${frontendUrl}/dashboard/org/${org.slug}/settings/subscription`;

    const { url } = await this.paymentGateway.createPortalSession({
      customerId: subscription.stripeCustomerId,
      returnUrl,
    });

    return { url };
  }
}
