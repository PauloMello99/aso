import { Inject, Injectable } from "@nestjs/common";
import type { OrgRole } from "../../domain/org.entity";
import type { InvitationStatus } from "../../domain/invitation.entity";
import {
  IInvitationRepository,
  INVITATION_REPOSITORY,
} from "../../domain/invitation.repository.interface";
import {
  IUserRepository,
  USER_REPOSITORY,
} from "../../../user/domain/user.repository.interface";
import { InvitationNotFoundException } from "../../domain/exceptions/invitation-not-found.exception";

export interface InvitationLookupView {
  orgId: string;
  orgName: string;
  orgSlug: string;
  email: string;
  role: OrgRole;
  status: InvitationStatus;
  expired: boolean;
  /** Se já existe conta para o e-mail convidado (drive login × cadastro). */
  hasAccount: boolean;
}

@Injectable()
export class GetInvitationByTokenUseCase {
  constructor(
    @Inject(INVITATION_REPOSITORY)
    private readonly invitationRepo: IInvitationRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepo: IUserRepository,
  ) {}

  async execute(token: string): Promise<InvitationLookupView> {
    const found = await this.invitationRepo.findByToken(token);
    if (!found) throw new InvitationNotFoundException(token);

    const { invitation, orgName, orgSlug } = found;
    const account = await this.userRepo.findByEmail(invitation.email);

    return {
      orgId: invitation.orgId,
      orgName,
      orgSlug,
      email: invitation.email,
      role: invitation.role,
      status: invitation.status,
      expired: invitation.expiresAt < new Date(),
      hasAccount: !!account,
    };
  }
}
