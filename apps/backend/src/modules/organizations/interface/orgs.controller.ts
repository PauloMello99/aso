import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "../../auth/guards/auth.guard";
import { OrgMembershipGuard } from "../../auth/guards/org-membership.guard";
import { CurrentUser } from "../../auth/decorators/current-user.decorator";
import type { AuthUser } from "../../auth/application/ports/auth-provider.interface";
import { GetMeUseCase } from "../../user/application/use-cases/get-me.use-case";
import { ListUserOrgsUseCase } from "../application/use-cases/list-user-orgs.use-case";
import { GetOrgUseCase } from "../application/use-cases/get-org.use-case";
import { ResolveOrgBySlugUseCase } from "../application/use-cases/resolve-org-by-slug.use-case";
import { CreateOrgUseCase } from "../application/use-cases/create-org.use-case";
import { UpdateOrgUseCase } from "../application/use-cases/update-org.use-case";
import { DeleteOrgUseCase } from "../application/use-cases/delete-org.use-case";
import { TransferOwnershipUseCase } from "../application/use-cases/transfer-ownership.use-case";
import { ListMembersUseCase } from "../application/use-cases/list-members.use-case";
import { InviteMemberUseCase } from "../application/use-cases/invite-member.use-case";
import { UpdateMemberRoleUseCase } from "../application/use-cases/update-member-role.use-case";
import { UpdateMemberPermissionsUseCase } from "../application/use-cases/update-member-permissions.use-case";
import { SetMemberStatusUseCase } from "../application/use-cases/set-member-status.use-case";
import { RemoveMemberUseCase } from "../application/use-cases/remove-member.use-case";
import { ListInvitationsUseCase } from "../application/use-cases/list-invitations.use-case";
import { CancelInvitationUseCase } from "../application/use-cases/cancel-invitation.use-case";
import { CreateOrgDto } from "./dto/create-org.dto";
import { UpdateOrgDto } from "./dto/update-org.dto";
import { InviteMemberDto } from "./dto/invite-member.dto";
import { UpdateMemberRoleDto } from "./dto/update-member-role.dto";
import { UpdateMemberPermissionsDto } from "./dto/update-member-permissions.dto";
import { SetMemberStatusDto } from "./dto/set-member-status.dto";
import { TransferOwnershipDto } from "./dto/transfer-ownership.dto";

@Controller("orgs")
@UseGuards(AuthGuard)
export class OrgsController {
  constructor(
    private readonly getMe: GetMeUseCase,
    private readonly listUserOrgs: ListUserOrgsUseCase,
    private readonly getOrg: GetOrgUseCase,
    private readonly resolveOrgBySlug: ResolveOrgBySlugUseCase,
    private readonly createOrg: CreateOrgUseCase,
    private readonly updateOrg: UpdateOrgUseCase,
    private readonly deleteOrg: DeleteOrgUseCase,
    private readonly transferOwnership: TransferOwnershipUseCase,
    private readonly listMembers: ListMembersUseCase,
    private readonly inviteMember: InviteMemberUseCase,
    private readonly updateMemberRole: UpdateMemberRoleUseCase,
    private readonly updateMemberPermissions: UpdateMemberPermissionsUseCase,
    private readonly setMemberStatus: SetMemberStatusUseCase,
    private readonly removeMember: RemoveMemberUseCase,
    private readonly listInvitations: ListInvitationsUseCase,
    private readonly cancelInvitation: CancelInvitationUseCase,
  ) {}

  /* ─── Org CRUD ──────────────────────────────────────────────── */

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.listUserOrgs.execute(user.id);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateOrgDto) {
    return this.createOrg.execute(dto.name, user.id);
  }

  /** Resolve por slug (membro ou super_admin). Antes de `:orgId` por ser path fixo. */
  @Get("by-slug/:slug")
  bySlug(@Param("slug") slug: string, @CurrentUser() user: AuthUser) {
    return this.resolveOrgBySlug.execute(slug, user.id);
  }

  @Get(":orgId")
  get(
    @Param("orgId", ParseUUIDPipe) orgId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.getOrg.execute(orgId, user.id);
  }

  @Patch(":orgId")
  update(
    @Param("orgId", ParseUUIDPipe) orgId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateOrgDto,
  ) {
    return this.updateOrg.execute(orgId, user.id, dto);
  }

  @Delete(":orgId")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param("orgId", ParseUUIDPipe) orgId: string,
    @CurrentUser() user: AuthUser,
  ) {
    await this.deleteOrg.execute(orgId, user.id);
  }

  @Post(":orgId/transfer-ownership")
  @HttpCode(HttpStatus.NO_CONTENT)
  async transfer(
    @Param("orgId", ParseUUIDPipe) orgId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: TransferOwnershipDto,
  ) {
    await this.transferOwnership.execute(orgId, dto.memberId, user.id);
  }

  /* ─── Members ───────────────────────────────────────────────── */

  @Get(":orgId/members")
  @UseGuards(OrgMembershipGuard)
  getMembers(@Param("orgId", ParseUUIDPipe) orgId: string) {
    return this.listMembers.execute(orgId);
  }

  @Post(":orgId/members/invite")
  async invite(
    @Param("orgId", ParseUUIDPipe) orgId: string,
    @CurrentUser() authUser: AuthUser,
    @Body() dto: InviteMemberDto,
  ) {
    const user = await this.getMe.execute(authUser);
    return this.inviteMember.execute({
      orgId,
      inviterAuthId: authUser.id,
      inviterUserId: user.id,
      email: dto.email,
      role: dto.role,
    });
  }

  @Patch(":orgId/members/:memberId/role")
  updateRole(
    @Param("orgId", ParseUUIDPipe) orgId: string,
    @Param("memberId", ParseUUIDPipe) memberId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    return this.updateMemberRole.execute(orgId, memberId, user.id, dto.role);
  }

  @Patch(":orgId/members/:memberId/permissions")
  updatePermissions(
    @Param("orgId", ParseUUIDPipe) orgId: string,
    @Param("memberId", ParseUUIDPipe) memberId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateMemberPermissionsDto,
  ) {
    return this.updateMemberPermissions.execute(
      orgId,
      memberId,
      user.id,
      dto.permissions,
    );
  }

  @Patch(":orgId/members/:memberId/status")
  setStatus(
    @Param("orgId", ParseUUIDPipe) orgId: string,
    @Param("memberId", ParseUUIDPipe) memberId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: SetMemberStatusDto,
  ) {
    return this.setMemberStatus.execute(orgId, memberId, user.id, dto.enabled);
  }

  @Delete(":orgId/members/:memberId")
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeOneMember(
    @Param("orgId", ParseUUIDPipe) orgId: string,
    @Param("memberId", ParseUUIDPipe) memberId: string,
    @CurrentUser() user: AuthUser,
  ) {
    await this.removeMember.execute(orgId, memberId, user.id);
  }

  /* ─── Invitations ───────────────────────────────────────────── */

  @Get(":orgId/invitations")
  getInvitations(
    @Param("orgId", ParseUUIDPipe) orgId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.listInvitations.execute(orgId, user.id);
  }

  @Delete(":orgId/invitations/:invId")
  @HttpCode(HttpStatus.NO_CONTENT)
  async cancelOneInvitation(
    @Param("orgId", ParseUUIDPipe) orgId: string,
    @Param("invId", ParseUUIDPipe) invId: string,
    @CurrentUser() user: AuthUser,
  ) {
    await this.cancelInvitation.execute(orgId, invId, user.id);
  }
}
