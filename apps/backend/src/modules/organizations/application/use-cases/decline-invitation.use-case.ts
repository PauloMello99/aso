import { Inject, Injectable } from "@nestjs/common";
import type { AuthUser } from "../../../auth/application/ports/auth-provider.interface";
import {
  IInvitationRepository,
  INVITATION_REPOSITORY,
} from "../../domain/invitation.repository.interface";
import { AuditService } from "../../../audit/audit.service";
import { InvitationNotFoundException } from "../../domain/exceptions/invitation-not-found.exception";
import { InvitationNotPendingException } from "../../domain/exceptions/invitation-not-pending.exception";
import { InvitationEmailMismatchException } from "../../domain/exceptions/invitation-email-mismatch.exception";

export interface DeclineInvitationInput {
  authUser: AuthUser;
  token: string;
}

@Injectable()
export class DeclineInvitationUseCase {
  constructor(
    @Inject(INVITATION_REPOSITORY)
    private readonly invitationRepo: IInvitationRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(input: DeclineInvitationInput): Promise<void> {
    const found = await this.invitationRepo.findByToken(input.token);
    if (!found) throw new InvitationNotFoundException(input.token);

    const { invitation } = found;
    if (invitation.status !== "pending") {
      throw new InvitationNotPendingException();
    }
    if (
      invitation.email.toLowerCase() !== input.authUser.email.toLowerCase()
    ) {
      throw new InvitationEmailMismatchException();
    }

    await this.invitationRepo.delete(invitation.id);

    await this.auditService.logByAuthId(input.authUser.id, {
      orgId: invitation.orgId,
      action: "delete",
      entityType: "org_invitation",
      entityId: invitation.id,
      metadata: { email: invitation.email, reason: "declined" },
    });
  }
}
