import { Controller, Get, Param, ParseUUIDPipe, UseGuards } from "@nestjs/common";
import { AuthGuard } from "../../auth/guards/auth.guard";
import { OrgMembershipGuard } from "../../auth/guards/org-membership.guard";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import type { AuthUser } from "../../auth/application/ports/auth-provider.interface";
import { GetOverviewUseCase } from "../application/get-overview.use-case";

@Controller("orgs/:orgId/overview")
@UseGuards(AuthGuard, OrgMembershipGuard)
export class OverviewController {
  constructor(private readonly getOverview: GetOverviewUseCase) {}

  @Get()
  get(
    @Param("orgId", ParseUUIDPipe) orgId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.getOverview.execute(orgId, user.id);
  }
}
