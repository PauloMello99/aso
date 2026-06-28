import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { ADMIN_REPOSITORY } from "./domain/admin.repository.interface";
import { DrizzleAdminRepository } from "./infrastructure/drizzle-admin.repository";
import { GetPlatformStatsUseCase } from "./application/use-cases/get-platform-stats.use-case";
import { ListPlatformOrgsUseCase } from "./application/use-cases/list-platform-orgs.use-case";
import { ListPlatformUsersUseCase } from "./application/use-cases/list-platform-users.use-case";
import { SetOrgSuspendedUseCase } from "./application/use-cases/set-org-suspended.use-case";
import { SetUserPlatformRoleUseCase } from "./application/use-cases/set-user-platform-role.use-case";
import { AdminController } from "./interface/admin.controller";

@Module({
  imports: [AuthModule],
  controllers: [AdminController],
  providers: [
    { provide: ADMIN_REPOSITORY, useClass: DrizzleAdminRepository },
    GetPlatformStatsUseCase,
    ListPlatformOrgsUseCase,
    ListPlatformUsersUseCase,
    SetOrgSuspendedUseCase,
    SetUserPlatformRoleUseCase,
  ],
})
export class AdminModule {}
