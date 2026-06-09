import { Inject, Injectable } from "@nestjs/common";
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

@Injectable()
export class ListInvitationsUseCase {
  constructor(
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly orgRepo: IOrganizationRepository,
    @Inject(INVITATION_REPOSITORY)
    private readonly invitationRepo: IInvitationRepository,
  ) {}

  async execute(
    orgId: string,
    authId: string,
  ): Promise<InvitationEntity[]> {
    const isOwner = await this.orgRepo.isOwner(orgId, authId);
    if (!isOwner) throw new OrgForbiddenException();

    return this.invitationRepo.findPendingByOrg(orgId);
  }
}
