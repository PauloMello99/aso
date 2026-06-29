import { Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { MailService } from "../../../mail/application/mail.service";
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
import { InvitationEmailFailedException } from "../../domain/exceptions/invitation-email-failed.exception";

export interface InviteMemberInput {
  orgId: string;
  inviterAuthId: string;
  inviterUserId: string;
  email: string;
  role: OrgRole;
}

export interface InviteMemberResult {
  invitation: InvitationEntity;
  /** Link de aceite com o token — exposto para teste manual em dev. */
  acceptUrl: string;
}

@Injectable()
export class InviteMemberUseCase {
  private readonly logger = new Logger(InviteMemberUseCase.name);

  constructor(
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly orgRepo: IOrganizationRepository,
    @Inject(INVITATION_REPOSITORY)
    private readonly invitationRepo: IInvitationRepository,
    private readonly mail: MailService,
    private readonly config: ConfigService,
  ) {}

  async execute(input: InviteMemberInput): Promise<InviteMemberResult> {
    const org = await this.orgRepo.findByIdAndAuthId(
      input.orgId,
      input.inviterAuthId,
    );
    if (!org) throw new OrgNotFoundException(input.orgId);

    const isOwner = await this.orgRepo.isOwner(input.orgId, input.inviterAuthId);
    if (!isOwner) throw new OrgForbiddenException();

    const invitation = await this.invitationRepo.create({
      orgId: input.orgId,
      invitedBy: input.inviterUserId,
      email: input.email,
      role: input.role,
    });

    const frontendUrl = this.config.get<string>(
      "FRONTEND_URL",
      "http://localhost:3000",
    );
    const acceptUrl = `${frontendUrl}/invite/accept?token=${invitation.token}`;

    // Envio CRÍTICO: o convidado só recebe o link por e-mail. Se o canal estiver
    // habilitado e o envio falhar, revertemos o convite (saga c/ compensação,
    // igual ao sign-up) e abortamos — o owner pode tentar de novo. Em dev o
    // canal é no-op (send retorna false) e o acceptUrl fica disponível p/ teste.
    try {
      await this.mail.sendOrgInvite({
        to: input.email,
        orgName: org.name,
        acceptUrl,
      });
    } catch (err) {
      await this.compensate(invitation.id);
      this.logger.error(
        `Falha ao enviar convite p/ ${input.email} (${org.name}); convite revertido: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
      throw new InvitationEmailFailedException(input.email);
    }

    this.logger.log(`Convite p/ ${input.email} (${org.name}): ${acceptUrl}`);
    return { invitation, acceptUrl };
  }

  /** Compensação best-effort: remove o convite órfão após falha de e-mail. */
  private async compensate(invitationId: string): Promise<void> {
    try {
      await this.invitationRepo.delete(invitationId);
    } catch (rollbackErr) {
      this.logger.error(
        `Falha ao reverter convite ${invitationId} após erro de e-mail`,
        rollbackErr instanceof Error ? rollbackErr.stack : undefined,
      );
    }
  }
}
