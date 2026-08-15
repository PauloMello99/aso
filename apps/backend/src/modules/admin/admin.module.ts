import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { UserModule } from "../user/user.module";
import { NotificationsInfrastructureModule } from "../notifications/infrastructure/notifications-infrastructure.module";
import { SupportInfrastructureModule } from "../support/infrastructure/support-infrastructure.module";
import { ADMIN_REPOSITORY } from "./domain/admin.repository.interface";
import { DrizzleAdminRepository } from "./infrastructure/drizzle-admin.repository";
import { GetPlatformStatsUseCase } from "./application/use-cases/get-platform-stats.use-case";
import { GetPlatformGrowthUseCase } from "./application/use-cases/get-platform-growth.use-case";
import { ListPlatformOrgsUseCase } from "./application/use-cases/list-platform-orgs.use-case";
import { ListPlatformUsersUseCase } from "./application/use-cases/list-platform-users.use-case";
import { GetOrgDetailUseCase } from "./application/use-cases/get-org-detail.use-case";
import { GetUserDetailUseCase } from "./application/use-cases/get-user-detail.use-case";
import { SetOrgSuspendedUseCase } from "./application/use-cases/set-org-suspended.use-case";
import { SetUserPlatformRoleUseCase } from "./application/use-cases/set-user-platform-role.use-case";
import { ListAuditLogsUseCase } from "../audit/application/use-cases/list-audit-logs.use-case";
import { ListOrgNotificationsUseCase } from "./application/use-cases/list-org-notifications.use-case";
import { ListAdminTicketQueueUseCase } from "../support/application/use-cases/list-admin-ticket-queue.use-case";
import { GetAdminTicketDetailUseCase } from "../support/application/use-cases/get-admin-ticket-detail.use-case";
import { AssignTicketUseCase } from "../support/application/use-cases/assign-ticket.use-case";
import { AddAgentResponseUseCase } from "../support/application/use-cases/add-agent-response.use-case";
import { ChangeTicketStatusUseCase } from "../support/application/use-cases/change-ticket-status.use-case";
import { LinkTicketToOrganizationUseCase } from "../support/application/use-cases/link-ticket-to-organization.use-case";
import { GetAdminTicketAttachmentUrlUseCase } from "../support/application/use-cases/get-admin-ticket-attachment-url.use-case";
import { AdminController } from "./interface/admin.controller";
import { AdminSupportController } from "./interface/admin-support.controller";

@Module({
  imports: [
    AuthModule,
    UserModule,
    NotificationsInfrastructureModule,
    SupportInfrastructureModule,
  ],
  controllers: [AdminController, AdminSupportController],
  providers: [
    { provide: ADMIN_REPOSITORY, useClass: DrizzleAdminRepository },
    GetPlatformStatsUseCase,
    GetPlatformGrowthUseCase,
    ListPlatformOrgsUseCase,
    ListPlatformUsersUseCase,
    GetOrgDetailUseCase,
    GetUserDetailUseCase,
    SetOrgSuspendedUseCase,
    SetUserPlatformRoleUseCase,
    ListAuditLogsUseCase,
    ListOrgNotificationsUseCase,
    ListAdminTicketQueueUseCase,
    GetAdminTicketDetailUseCase,
    AssignTicketUseCase,
    AddAgentResponseUseCase,
    ChangeTicketStatusUseCase,
    LinkTicketToOrganizationUseCase,
    GetAdminTicketAttachmentUrlUseCase,
  ],
})
export class AdminModule {}
