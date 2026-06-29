import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "../../auth/guards/auth.guard";
import { PlatformAdminGuard } from "../../auth/guards/platform-admin.guard";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import { AuthUser } from "../../auth/application/ports/auth-provider.interface";
import { GetPlatformStatsUseCase } from "../application/use-cases/get-platform-stats.use-case";
import { GetPlatformGrowthUseCase } from "../application/use-cases/get-platform-growth.use-case";
import { ListPlatformOrgsUseCase } from "../application/use-cases/list-platform-orgs.use-case";
import { ListPlatformUsersUseCase } from "../application/use-cases/list-platform-users.use-case";
import { GetOrgDetailUseCase } from "../application/use-cases/get-org-detail.use-case";
import { GetUserDetailUseCase } from "../application/use-cases/get-user-detail.use-case";
import { SetOrgSuspendedUseCase } from "../application/use-cases/set-org-suspended.use-case";
import { SetUserPlatformRoleUseCase } from "../application/use-cases/set-user-platform-role.use-case";
import { SetSuspendedDto } from "./dto/set-suspended.dto";
import { SetPlatformRoleDto } from "./dto/set-platform-role.dto";

/**
 * Painel da plataforma (PLAT-1). Rotas NÃO org-scoped, restritas ao super_admin
 * via {@link PlatformAdminGuard}.
 */
@Controller("admin")
@UseGuards(AuthGuard, PlatformAdminGuard)
export class AdminController {
  constructor(
    private readonly getStats: GetPlatformStatsUseCase,
    private readonly getGrowth: GetPlatformGrowthUseCase,
    private readonly listOrgs: ListPlatformOrgsUseCase,
    private readonly listUsers: ListPlatformUsersUseCase,
    private readonly getOrgDetail: GetOrgDetailUseCase,
    private readonly getUserDetail: GetUserDetailUseCase,
    private readonly setOrgSuspended: SetOrgSuspendedUseCase,
    private readonly setUserPlatformRole: SetUserPlatformRoleUseCase,
  ) {}

  @Get("stats")
  stats() {
    return this.getStats.execute();
  }

  @Get("stats/growth")
  growth() {
    return this.getGrowth.execute();
  }

  @Get("orgs")
  orgs() {
    return this.listOrgs.execute();
  }

  @Get("orgs/:id")
  orgDetail(@Param("id", ParseUUIDPipe) id: string) {
    return this.getOrgDetail.execute(id);
  }

  @Get("users")
  users() {
    return this.listUsers.execute();
  }

  @Get("users/:id")
  userDetail(@Param("id", ParseUUIDPipe) id: string) {
    return this.getUserDetail.execute(id);
  }

  @Patch("orgs/:id/suspend")
  @HttpCode(HttpStatus.NO_CONTENT)
  async suspend(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: SetSuspendedDto,
  ) {
    await this.setOrgSuspended.execute(id, dto.suspended);
  }

  @Patch("users/:id/platform-role")
  @HttpCode(HttpStatus.NO_CONTENT)
  async platformRole(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: SetPlatformRoleDto,
    @CurrentUser() user: AuthUser,
  ) {
    await this.setUserPlatformRole.execute(id, dto.role, user.id);
  }
}
