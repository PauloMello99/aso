import { Inject, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  ISubscriptionRepository,
  SUBSCRIPTION_REPOSITORY,
} from "../../domain/subscription.repository.interface";
import {
  IBillingPlanRepository,
  BILLING_PLAN_REPOSITORY,
} from "../../domain/billing-plan.repository.interface";
import {
  IPaymentGateway,
  PAYMENT_GATEWAY,
} from "../../domain/ports/payment-gateway.port";
import {
  IOrganizationRepository,
  ORGANIZATION_REPOSITORY,
} from "../../../organizations/domain/org.repository.interface";
import {
  IMemberRepository,
  MEMBER_REPOSITORY,
} from "../../../organizations/domain/member.repository.interface";
import { DEFAULT_PLAN_KEY } from "../../domain/plan-catalog";
import { SubscriptionNotFoundException } from "../../domain/exceptions/subscription-not-found.exception";
import { PlanNotAvailableException } from "../../domain/exceptions/plan-not-available.exception";

@Injectable()
export class CreateCheckoutSessionUseCase {
  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY)
    private readonly subscriptionRepo: ISubscriptionRepository,
    @Inject(BILLING_PLAN_REPOSITORY)
    private readonly billingPlanRepo: IBillingPlanRepository,
    @Inject(PAYMENT_GATEWAY)
    private readonly paymentGateway: IPaymentGateway,
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly orgRepo: IOrganizationRepository,
    @Inject(MEMBER_REPOSITORY)
    private readonly memberRepo: IMemberRepository,
    private readonly config: ConfigService,
  ) {}

  async execute(
    orgId: string,
    actorUserId: string,
  ): Promise<{ url: string }> {
    const subscription = await this.subscriptionRepo.findByOrgId(orgId);
    if (!subscription) throw new SubscriptionNotFoundException(orgId);

    // `actorUserId` here is the Supabase authId (as forwarded by controllers
    // from `AuthUser.id`), so it resolves against auth-keyed repo methods.
    const org = await this.orgRepo.findByIdAndAuthId(orgId, actorUserId);
    if (!org) throw new SubscriptionNotFoundException(orgId);

    // Owner email is approximated by the acting user's email: checkout is
    // expected to be owner-gated at the controller/guard layer (next step),
    // so actor === owner in practice. Documented as a deviation.
    const member = await this.memberRepo.findByAuthId(orgId, actorUserId);
    if (!member) throw new SubscriptionNotFoundException(orgId);

    const plan = await this.billingPlanRepo.findByKey(DEFAULT_PLAN_KEY);
    if (!plan || !plan.active) {
      throw new PlanNotAvailableException();
    }
    if (!plan.stripePriceId) {
      throw new PlanNotAvailableException();
    }

    let customerId = subscription.stripeCustomerId;
    if (!customerId) {
      const created = await this.paymentGateway.createCustomer({
        orgId,
        email: member.userEmail,
        name: org.name,
      });
      customerId = created.customerId;
      await this.subscriptionRepo.update(orgId, {
        stripeCustomerId: customerId,
      });
    }

    const frontendUrl = this.config.getOrThrow<string>("FRONTEND_URL");
    const successUrl = `${frontendUrl}/dashboard/org/${org.slug}/settings/subscription?checkout=success`;
    const cancelUrl = `${frontendUrl}/dashboard/org/${org.slug}/settings/subscription?checkout=cancel`;

    const { url } = await this.paymentGateway.createCheckoutSession({
      customerId,
      priceId: plan.stripePriceId,
      successUrl,
      cancelUrl,
    });

    return { url };
  }
}
