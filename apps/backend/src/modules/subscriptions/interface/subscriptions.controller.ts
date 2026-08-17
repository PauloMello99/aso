import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../../auth/guards/auth.guard";
import { OrgMembershipGuard } from "../../auth/guards/org-membership.guard";
import { OrgOwnerGuard } from "../../auth/guards/org-owner.guard";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import { AuthUser } from "../../auth/application/ports/auth-provider.interface";
import { GetSubscriptionUseCase } from "../application/use-cases/get-subscription.use-case";
import { CreateCheckoutSessionUseCase } from "../application/use-cases/create-checkout-session.use-case";
import { CreatePortalSessionUseCase } from "../application/use-cases/create-portal-session.use-case";
import { CreateCheckoutSessionDto } from "./dto/create-checkout-session.dto";

@Controller("orgs/:orgId/subscription")
@UseGuards(AuthGuard, OrgMembershipGuard)
export class SubscriptionsController {
  constructor(
    private readonly getSubscription: GetSubscriptionUseCase,
    private readonly createCheckoutSession: CreateCheckoutSessionUseCase,
    private readonly createPortalSession: CreatePortalSessionUseCase,
  ) {}

  @Get()
  async get(@Param("orgId", ParseUUIDPipe) orgId: string) {
    return this.getSubscription.execute(orgId);
  }

  @Post("checkout")
  @UseGuards(OrgOwnerGuard)
  async checkout(
    @Param("orgId", ParseUUIDPipe) orgId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateCheckoutSessionDto,
  ) {
    return this.createCheckoutSession.execute(orgId, user.id, dto.interval);
  }

  @Post("portal")
  @UseGuards(OrgOwnerGuard)
  async portal(
    @Param("orgId", ParseUUIDPipe) orgId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.createPortalSession.execute(orgId, user.id);
  }
}
