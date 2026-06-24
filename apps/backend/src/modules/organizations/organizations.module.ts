import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { UserModule } from "../user/user.module";
import { NotificationsInfrastructureModule } from "../notifications/infrastructure/notifications-infrastructure.module";
import { OrgsInfrastructureModule } from "./infrastructure/orgs-infrastructure.module";
import { ListUserOrgsUseCase } from "./application/use-cases/list-user-orgs.use-case";
import { GetOrgUseCase } from "./application/use-cases/get-org.use-case";
import { CreateOrgUseCase } from "./application/use-cases/create-org.use-case";
import { UpdateOrgUseCase } from "./application/use-cases/update-org.use-case";
import { DeleteOrgUseCase } from "./application/use-cases/delete-org.use-case";
import { ListMembersUseCase } from "./application/use-cases/list-members.use-case";
import { InviteMemberUseCase } from "./application/use-cases/invite-member.use-case";
import { UpdateMemberRoleUseCase } from "./application/use-cases/update-member-role.use-case";
import { UpdateMemberPermissionsUseCase } from "./application/use-cases/update-member-permissions.use-case";
import { SetMemberStatusUseCase } from "./application/use-cases/set-member-status.use-case";
import { RemoveMemberUseCase } from "./application/use-cases/remove-member.use-case";
import { ListInvitationsUseCase } from "./application/use-cases/list-invitations.use-case";
import { CancelInvitationUseCase } from "./application/use-cases/cancel-invitation.use-case";
import { GetInvitationByTokenUseCase } from "./application/use-cases/get-invitation-by-token.use-case";
import { AcceptInvitationUseCase } from "./application/use-cases/accept-invitation.use-case";
import { DeclineInvitationUseCase } from "./application/use-cases/decline-invitation.use-case";
import { OrgsController } from "./interface/orgs.controller";
import { InvitationsController } from "./interface/invitations.controller";

@Module({
  imports: [
    AuthModule,
    UserModule,
    NotificationsInfrastructureModule,
    OrgsInfrastructureModule,
  ],
  controllers: [OrgsController, InvitationsController],
  providers: [
    ListUserOrgsUseCase,
    GetOrgUseCase,
    CreateOrgUseCase,
    UpdateOrgUseCase,
    DeleteOrgUseCase,
    ListMembersUseCase,
    InviteMemberUseCase,
    UpdateMemberRoleUseCase,
    UpdateMemberPermissionsUseCase,
    SetMemberStatusUseCase,
    RemoveMemberUseCase,
    ListInvitationsUseCase,
    CancelInvitationUseCase,
    GetInvitationByTokenUseCase,
    AcceptInvitationUseCase,
    DeclineInvitationUseCase,
  ],
})
export class OrganizationsModule {}
