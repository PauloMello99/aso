import { Inject, Injectable } from "@nestjs/common";
import type { AuthUser } from "../../../auth/application/ports/auth-provider.interface";
import {
  IInvitationRepository,
  INVITATION_REPOSITORY,
} from "../../domain/invitation.repository.interface";
import {
  IMemberRepository,
  MEMBER_REPOSITORY,
} from "../../domain/member.repository.interface";
import {
  IUserRepository,
  USER_REPOSITORY,
} from "../../../user/domain/user.repository.interface";
import { InvitationNotFoundException } from "../../domain/exceptions/invitation-not-found.exception";
import { InvitationNotPendingException } from "../../domain/exceptions/invitation-not-pending.exception";
import { InvitationExpiredException } from "../../domain/exceptions/invitation-expired.exception";
import { InvitationEmailMismatchException } from "../../domain/exceptions/invitation-email-mismatch.exception";
import { UserNotFoundException } from "../../../user/domain/exceptions/user-not-found.exception";
import { DEFAULT_EMPLOYEE_PERMISSIONS } from "../../domain/member-permissions";

export interface AcceptInvitationInput {
  authUser: AuthUser;
  token: string;
}

export interface AcceptInvitationResult {
  orgId: string;
  orgSlug: string;
}

@Injectable()
export class AcceptInvitationUseCase {
  constructor(
    @Inject(INVITATION_REPOSITORY)
    private readonly invitationRepo: IInvitationRepository,
    @Inject(MEMBER_REPOSITORY)
    private readonly memberRepo: IMemberRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepo: IUserRepository,
  ) {}

  async execute(input: AcceptInvitationInput): Promise<AcceptInvitationResult> {
    const found = await this.invitationRepo.findByToken(input.token);
    if (!found) throw new InvitationNotFoundException(input.token);

    const { invitation, orgSlug } = found;
    if (invitation.status !== "pending") {
      throw new InvitationNotPendingException();
    }
    if (invitation.expiresAt <= new Date()) {
      throw new InvitationExpiredException();
    }
    if (
      invitation.email.toLowerCase() !== input.authUser.email.toLowerCase()
    ) {
      throw new InvitationEmailMismatchException();
    }

    const user = await this.userRepo.findByAuthId(input.authUser.id);
    if (!user) throw new UserNotFoundException(input.authUser.id);

    await this.memberRepo.upsert({
      orgId: invitation.orgId,
      userId: user.id,
      role: invitation.role,
      // Funcionário começa restrito (só o essencial); owner libera o resto.
      permissions:
        invitation.role === "employee" ? DEFAULT_EMPLOYEE_PERMISSIONS : [],
    });
    await this.invitationRepo.markAccepted(invitation.id);

    return { orgId: invitation.orgId, orgSlug };
  }
}
