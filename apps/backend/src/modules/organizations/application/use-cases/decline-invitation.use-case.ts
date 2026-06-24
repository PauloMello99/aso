import { Inject, Injectable } from "@nestjs/common";
import type { AuthUser } from "../../../auth/application/ports/auth-provider.interface";
import {
  IInvitationRepository,
  INVITATION_REPOSITORY,
} from "../../domain/invitation.repository.interface";
import { InvitationNotFoundException } from "../../domain/exceptions/invitation-not-found.exception";
import { InvitationNotPendingException } from "../../domain/exceptions/invitation-not-pending.exception";
import { InvitationEmailMismatchException } from "../../domain/exceptions/invitation-email-mismatch.exception";

export interface DeclineInvitationInput {
  authUser: AuthUser;
  token: string;
}

/**
 * Recusa de convite pelo convidado: **remove** o convite (não só cancela), para
 * que o owner possa reenviar o fluxo depois. Só o próprio convidado (e-mail bate)
 * pode recusar um convite ainda pendente.
 */
@Injectable()
export class DeclineInvitationUseCase {
  constructor(
    @Inject(INVITATION_REPOSITORY)
    private readonly invitationRepo: IInvitationRepository,
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
  }
}
