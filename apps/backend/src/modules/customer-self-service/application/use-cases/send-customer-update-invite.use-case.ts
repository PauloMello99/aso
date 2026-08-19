import { Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  ICustomerUpdateInvitationRepository,
  CUSTOMER_UPDATE_INVITATION_REPOSITORY,
} from "../../domain/customer-update-invitation.repository.interface";
import type { CustomerUpdateInvitationEntity } from "../../domain/customer-update-invitation.entity";
import { CustomerUpdateInvitationInviteEmailFailedException } from "../../domain/exceptions/customer-update-invitation-invite-email-failed.exception";
import {
  ICustomerRepository,
  CUSTOMER_REPOSITORY,
} from "../../../customers/domain/customer.repository.interface";
import { CustomerNotFoundException } from "../../../customers/domain/exceptions/customer-not-found.exception";
import {
  IMemberRepository,
  MEMBER_REPOSITORY,
} from "../../../organizations/domain/member.repository.interface";
import {
  IOrganizationRepository,
  ORGANIZATION_REPOSITORY,
} from "../../../organizations/domain/org.repository.interface";
import { OrgNotFoundException } from "../../../organizations/domain/exceptions/org-not-found.exception";
import { resolveMembership } from "../../../services/application/use-cases/resolve-membership";
import { MailService } from "../../../mail/application/mail.service";
import { AuditService } from "../../../audit/audit.service";

export interface SendCustomerUpdateInviteInput {
  orgId: string;
  authId: string;
  customerId: string;
}

export interface SendCustomerUpdateInviteResult {
  invitation: CustomerUpdateInvitationEntity;
  fillUrl: string;
}

@Injectable()
export class SendCustomerUpdateInviteUseCase {
  private readonly logger = new Logger(SendCustomerUpdateInviteUseCase.name);

  constructor(
    @Inject(CUSTOMER_UPDATE_INVITATION_REPOSITORY)
    private readonly updateInviteRepo: ICustomerUpdateInvitationRepository,
    @Inject(CUSTOMER_REPOSITORY)
    private readonly customerRepo: ICustomerRepository,
    @Inject(MEMBER_REPOSITORY)
    private readonly memberRepo: IMemberRepository,
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly orgRepo: IOrganizationRepository,
    private readonly mail: MailService,
    private readonly config: ConfigService,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    input: SendCustomerUpdateInviteInput,
  ): Promise<SendCustomerUpdateInviteResult> {
    const { userId } = await resolveMembership(
      this.memberRepo,
      input.orgId,
      input.authId,
    );

    const org = await this.orgRepo.findByIdAndAuthId(
      input.orgId,
      input.authId,
    );
    if (!org) throw new OrgNotFoundException(input.orgId);

    const customer = await this.customerRepo.findById(
      input.customerId,
      input.orgId,
    );
    if (!customer) throw new CustomerNotFoundException(input.customerId);

    let invitation: CustomerUpdateInvitationEntity | null = null;
    let createdNew = false;

    const pending = await this.updateInviteRepo.findPendingByCustomer(
      input.orgId,
      input.customerId,
    );
    if (pending && !pending.isExpired) {
      invitation = pending;
    } else {
      if (pending && pending.isExpired) {
        await this.updateInviteRepo.delete(pending.id);
      }

      invitation = await this.updateInviteRepo.create({
        orgId: input.orgId,
        customerId: input.customerId,
        createdBy: userId,
      });
      createdNew = true;
    }

    const frontendUrl = this.config.get<string>(
      "FRONTEND_URL",
      "http://localhost:3000",
    );
    const fillUrl = `${frontendUrl}/customer-update/${invitation.token}`;

    try {
      await this.mail.sendCustomerUpdateLink({
        to: customer.email,
        customerName: customer.name,
        orgName: org.name,
        fillUrl,
      });
    } catch (err) {
      if (createdNew) {
        await this.compensate(invitation.id);
      }
      this.logger.error(
        `Falha ao enviar convite de atualização cadastral p/ ${customer.email}; ${
          createdNew ? "registro revertido" : "reenvio de convite pendente falhou"
        }: ${err instanceof Error ? err.message : String(err)}`,
      );
      throw new CustomerUpdateInvitationInviteEmailFailedException(
        customer.email,
      );
    }

    await this.auditService.log({
      actorId: userId,
      orgId: input.orgId,
      action: "customer_update_invite_sent",
      entityType: "customer_update_invitation",
      entityId: invitation.id,
      metadata: { customerId: input.customerId },
    });

    return { invitation, fillUrl };
  }

  private async compensate(invitationId: string): Promise<void> {
    try {
      await this.updateInviteRepo.delete(invitationId);
    } catch (rollbackErr) {
      this.logger.error(
        `Falha ao reverter convite de atualização cadastral ${invitationId} após erro de e-mail`,
        rollbackErr instanceof Error ? rollbackErr.stack : undefined,
      );
    }
  }
}
