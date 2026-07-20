import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "../../auth/guards/auth.guard";
import { OrgMembershipGuard } from "../../auth/guards/org-membership.guard";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import type { AuthUser } from "../../auth/application/ports/auth-provider.interface";
import { GetOverviewUseCase } from "../application/get-overview.use-case";
import { GetOverviewAnalyticsUseCase } from "../application/get-overview-analytics.use-case";

function startOfCurrentMonth(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

@Controller("orgs/:orgId/overview")
@UseGuards(AuthGuard, OrgMembershipGuard)
export class OverviewController {
  constructor(
    private readonly getOverview: GetOverviewUseCase,
    private readonly getAnalytics: GetOverviewAnalyticsUseCase,
  ) {}

  @Get()
  get(
    @Param("orgId", ParseUUIDPipe) orgId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.getOverview.execute(orgId, user.id);
  }

  @Get("analytics")
  analytics(
    @Param("orgId", ParseUUIDPipe) orgId: string,
    @CurrentUser() user: AuthUser,
    @Query("from") from?: string,
    @Query("to") to?: string,
  ) {
    const fromDate = from ? new Date(from) : startOfCurrentMonth();
    const toDate = to ? new Date(to) : new Date();
    return this.getAnalytics.execute(orgId, user.id, fromDate, toDate);
  }
}
