import { Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
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
import {
  EMAIL_SENDER,
  IEmailSender,
} from "../../../notifications/domain/ports/email-sender.port";
import { OrgForbiddenException } from "../../domain/exceptions/org-forbidden.exception";
import { OrgNotFoundException } from "../../domain/exceptions/org-not-found.exception";

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
    @Inject(EMAIL_SENDER)
    private readonly email: IEmailSender,
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

    // Envio best-effort (no-op em dev — o link fica logado/exposto p/ teste).
    await this.email.send({
      to: input.email,
      subject: `Convite para ${org.name} no Ink Ops`,
      html: invitationEmailHtml(org.name, acceptUrl),
    });
    this.logger.log(`Convite p/ ${input.email} (${org.name}): ${acceptUrl}`);

    return { invitation, acceptUrl };
  }
}

function invitationEmailHtml(orgName: string, acceptUrl: string): string {
  return `
    <p>Você foi convidado para participar de <strong>${escapeHtml(orgName)}</strong> no Ink Ops.</p>
    <p><a href="${acceptUrl}">Clique aqui para aceitar o convite</a></p>
    <p>Ou copie e cole este link no navegador:<br>${acceptUrl}</p>
    <p>O convite expira em 7 dias.</p>
  `;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
