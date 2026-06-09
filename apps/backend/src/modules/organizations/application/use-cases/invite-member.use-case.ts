import { Inject, Injectable } from "@nestjs/common";
import type { OrgRole } from "../../domain/org.entity";
import type { InvitationEntity } from "../../domain/invitation.entity";
import {
  IOrganizationRepository,
  ORGANIZATION_REPOSITORY,
} from "../../domain/org.repository.interface";
import {
  IInvitationRepository,
  INVITATION_REPOSITORY,
} from "../../domain/invitation.repository.interface";
import { OrgForbiddenException } from "../../domain/exceptions/org-forbidden.exception";
import { OrgNotFoundException } from "../../domain/exceptions/org-not-found.exception";

export interface InviteMemberInput {
  orgId: string;
  inviterAuthId: string;
  inviterUserId: string;
  email: string;
  role: OrgRole;
}

@Injectable()
export class InviteMemberUseCase {
  constructor(
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly orgRepo: IOrganizationRepository,
    @Inject(INVITATION_REPOSITORY)
    private readonly invitationRepo: IInvitationRepository,
  ) {}

  async execute(input: InviteMemberInput): Promise<InvitationEntity> {
    const org = await this.orgRepo.findByIdAndAuthId(
      input.orgId,
      input.inviterAuthId,
    );
    if (!org) throw new OrgNotFoundException(input.orgId);

    const isOwner = await this.orgRepo.isOwner(input.orgId, input.inviterAuthId);
    if (!isOwner) throw new OrgForbiddenException();

    return this.invitationRepo.create({
      orgId: input.orgId,
      invitedBy: input.inviterUserId,
      email: input.email,
      role: input.role,
    });
  }
}
