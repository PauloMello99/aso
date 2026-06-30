import { Inject, Injectable } from "@nestjs/common";
import {
  IOrganizationRepository,
  ORGANIZATION_REPOSITORY,
} from "../../domain/org.repository.interface";
import {
  IInvitationRepository,
  INVITATION_REPOSITORY,
} from "../../domain/invitation.repository.interface";
import { AuditService } from "../../../audit/audit.service";
import { OrgForbiddenException } from "../../domain/exceptions/org-forbidden.exception";
import { InvitationNotFoundException } from "../../domain/exceptions/invitation-not-found.exception";

@Injectable()
export class CancelInvitationUseCase {
  constructor(
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly orgRepo: IOrganizationRepository,
    @Inject(INVITATION_REPOSITORY)
    private readonly invitationRepo: IInvitationRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    orgId: string,
    invitationId: string,
    authId: string,
  ): Promise<void> {
    const isOwner = await this.orgRepo.isOwner(orgId, authId);
    if (!isOwner) throw new OrgForbiddenException();

    const invitation = await this.invitationRepo.findById(invitationId, orgId);
    if (!invitation) throw new InvitationNotFoundException(invitationId);

    await this.invitationRepo.cancel(invitationId);

    await this.auditService.logByAuthId(authId, {
      orgId,
      action: "delete",
      entityType: "org_invitation",
      entityId: invitationId,
      metadata: { reason: "cancelled" },
    });
  }
}
