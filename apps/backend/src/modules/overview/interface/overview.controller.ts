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
import { OrgModuleGuard } from "../../auth/guards/org-module.guard";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import { RequireModule } from "../../auth/decorators/require-module.decorator";
import type { AuthUser } from "../../auth/application/ports/auth-provider.interface";
import { GetOverviewUseCase } from "../application/get-overview.use-case";
import { GetOverviewAnalyticsUseCase } from "../application/get-overview-analytics.use-case";
import { parseOverviewPeriod } from "../domain/overview-period";
import { OverviewInvalidPeriodException } from "../domain/exceptions/overview-invalid-period.exception";

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
    @Query("from") from?: string,
    @Query("to") to?: string,
  ) {
    return this.getOverview.execute(
      orgId,
      user.id,
      parseOverviewPeriod(from, to),
    );
  }

  @Get("analytics")
  @UseGuards(OrgModuleGuard)
  @RequireModule("services")
  analytics(
    @Param("orgId", ParseUUIDPipe) orgId: string,
    @CurrentUser() user: AuthUser,
    @Query("from") from?: string,
    @Query("to") to?: string,
  ) {
    const period = parseOverviewPeriod(from, to);
    const fromDate = period.from ?? startOfCurrentMonth();
    const toDate = period.to ?? new Date();
    if (fromDate.getTime() > toDate.getTime()) {
      throw new OverviewInvalidPeriodException(
        'O parâmetro "from" deve ser anterior ou igual a "to".',
      );
    }
    return this.getAnalytics.execute(orgId, user.id, fromDate, toDate);
  }
}
