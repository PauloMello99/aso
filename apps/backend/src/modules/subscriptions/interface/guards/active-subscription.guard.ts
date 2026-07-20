import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Request } from "express";
import { EntitlementsService } from "../../application/entitlements.service";
import { SubscriptionRequiredException } from "../../domain/exceptions/subscription-required.exception";

/**
 * Blocks write operations for organizations without an active (or trialing /
 * comp / past_due-grace) subscription. Must NEVER be registered as a global
 * `APP_GUARD` — it has to run after `AuthGuard`/`OrgMembershipGuard` have
 * already resolved `request.user`/`request.params.orgId`, so it is applied
 * per-handler (method-level `@UseGuards`) on write routes only, the same
 * position `OrgOwnerGuard` occupies today.
 */
@Injectable()
export class ActiveSubscriptionGuard implements CanActivate {
  constructor(private readonly entitlements: EntitlementsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const orgId = request.params?.orgId;

    if (typeof orgId !== "string" || !orgId) {
      throw new ForbiddenException("Missing organization context");
    }

    const entitlement = await this.entitlements.resolve(orgId);
    if (entitlement.plan === "locked") {
      throw new SubscriptionRequiredException();
    }

    return true;
  }
}
