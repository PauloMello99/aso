import { Inject, Injectable } from "@nestjs/common";
import {
  ISubscriptionRepository,
  SUBSCRIPTION_REPOSITORY,
} from "../domain/subscription.repository.interface";
import type { SubscriptionStatus } from "../domain/subscription.entity";

export interface Entitlement {
  plan: "locked" | "standard";
  status: SubscriptionStatus;
  source: "stripe" | "comp" | "none";
}

/**
 * Read-only resolver of what an org is entitled to right now, based on the
 * raw subscription state. Never throws: entitlement checks must not break
 * because of an infra hiccup or a missing row.
 *
 * Grace-period / expiry enforcement (locking a `past_due` subscription after
 * its grace window, expiring a `custom` comp) is the cron/guard's job, not
 * this service's — it only reflects the current raw state.
 */
@Injectable()
export class EntitlementsService {
  constructor(
    @Inject(SUBSCRIPTION_REPOSITORY)
    private readonly subscriptionRepo: ISubscriptionRepository,
  ) {}

  async resolve(orgId: string): Promise<Entitlement> {
    const subscription = await this.subscriptionRepo.findByOrgId(orgId);
    if (!subscription) {
      return { plan: "locked", status: "canceled", source: "none" };
    }

    if (subscription.type === "custom") {
      return { plan: "standard", status: subscription.status, source: "comp" };
    }

    if (subscription.status === "trialing") {
      return { plan: "standard", status: "trialing", source: "stripe" };
    }

    if (subscription.status === "active") {
      return { plan: "standard", status: "active", source: "stripe" };
    }

    if (subscription.status === "past_due") {
      return { plan: "standard", status: "past_due", source: "stripe" };
    }

    return { plan: "locked", status: subscription.status, source: "none" };
  }
}
