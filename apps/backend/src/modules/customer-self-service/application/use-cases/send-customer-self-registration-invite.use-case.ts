import { Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  ICustomerSelfRegistrationRepository,
  CUSTOMER_SELF_REGISTRATION_REPOSITORY,
} from "../../domain/customer-self-registration.repository.interface";
import type { CustomerSelfRegistrationEntity } from "../../domain/customer-self-registration.entity";
import { CustomerSelfRegistrationInviteEmailFailedException } from "../../domain/exceptions/customer-self-registration-invite-email-failed.exception";
import {
  IAnamnesisResponseRepository,
  ANAMNESIS_RESPONSE_REPOSITORY,
} from "../../../anamnesis/domain/anamnesis-response.repository.interface";
import { AnamnesisFormNotConfiguredException } from "../../../anamnesis/domain/exceptions/anamnesis-form-not-configured.exception";
import { GetCurrentAnamnesisFormVersionUseCase } from "../../../anamnesis/application/use-cases/get-current-anamnesis-form-version.use-case";
import {
  ICustomerRepository,
  CUSTOMER_REPOSITORY,
} from "../../../customers/domain/customer.repository.interface";
import { CustomerEmailAlreadyExistsException } from "../../../customers/domain/exceptions/customer-email-already-exists.exception";
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

export interface SendCustomerSelfRegistrationInviteInput {
  orgId: string;
  authId: string;
  email: string;
  serviceTypeId: string;
}

export interface SendCustomerSelfRegistrationInviteResult {
  registration: CustomerSelfRegistrationEntity;
  fillUrl: string;
}

@Injectable()
export class SendCustomerSelfRegistrationInviteUseCase {
  private readonly logger = new Logger(
    SendCustomerSelfRegistrationInviteUseCase.name,
  );

  constructor(
    @Inject(CUSTOMER_SELF_REGISTRATION_REPOSITORY)
    private readonly selfRegRepo: ICustomerSelfRegistrationRepository,
    @Inject(ANAMNESIS_RESPONSE_REPOSITORY)
    private readonly anamnesisResponseRepo: IAnamnesisResponseRepository,
    @Inject(CUSTOMER_REPOSITORY)
    private readonly customerRepo: ICustomerRepository,
    @Inject(MEMBER_REPOSITORY)
    private readonly memberRepo: IMemberRepository,
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly orgRepo: IOrganizationRepository,
    private readonly getCurrentVersion: GetCurrentAnamnesisFormVersionUseCase,
    private readonly mail: MailService,
    private readonly config: ConfigService,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    input: SendCustomerSelfRegistrationInviteInput,
  ): Promise<SendCustomerSelfRegistrationInviteResult> {
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

    const existingCustomer = await this.customerRepo.findByEmail(
      input.orgId,
      input.email,
    );
    if (existingCustomer) {
      throw new CustomerEmailAlreadyExistsException(input.email);
    }

    let registration: CustomerSelfRegistrationEntity | null = null;
    let createdNewResponseId: string | null = null;
    let createdNew = false;

    const pending = await this.selfRegRepo.findPendingByEmail(
      input.orgId,
      input.email,
    );
    // Reaproveitar um convite pendente só é seguro quando o serviceTypeId bate: a
    // resposta de anamnese já criada (e o snapshot de perguntas nela) é específica
    // do serviceTypeId original. Se o novo pedido for para outro serviceTypeId,
    // tratamos como se o pendente estivesse expirado — apaga e recria do zero.
    const pendingReusable =
      pending !== null &&
      !pending.isExpired &&
      pending.serviceTypeId === input.serviceTypeId;

    if (pendingReusable) {
      registration = pending;
    } else {
      if (pending) {
        await this.selfRegRepo.delete(pending.id);
      }

      const version = await this.getCurrentVersion.execute(
        input.serviceTypeId,
        input.orgId,
      );
      if (!version) {
        throw new AnamnesisFormNotConfiguredException(input.serviceTypeId);
      }

      const response = await this.anamnesisResponseRepo.create({
        orgId: input.orgId,
        formVersionId: version.id,
        serviceTypeId: input.serviceTypeId,
        customerId: null,
        questionsSnapshot: version.questions,
        createdBy: userId,
      });
      createdNewResponseId = response.id;

      registration = await this.selfRegRepo.create({
        orgId: input.orgId,
        email: input.email,
        serviceTypeId: input.serviceTypeId,
        anamnesisResponseId: response.id,
        createdBy: userId,
      });
      createdNew = true;
    }

    const frontendUrl = this.config.get<string>(
      "FRONTEND_URL",
      "http://localhost:3000",
    );
    const fillUrl = `${frontendUrl}/customer-registration/${registration.token}`;

    try {
      await this.mail.sendCustomerSelfRegistrationLink({
        to: input.email,
        orgName: org.name,
        fillUrl,
      });
    } catch (err) {
      if (createdNew) {
        await this.compensate(registration.id, createdNewResponseId);
      }
      this.logger.error(
        `Falha ao enviar convite de auto-cadastro p/ ${input.email}; ${
          createdNew ? "registro revertido" : "reenvio de registro pendente falhou"
        }: ${err instanceof Error ? err.message : String(err)}`,
      );
      throw new CustomerSelfRegistrationInviteEmailFailedException(input.email);
    }

    await this.auditService.log({
      actorId: userId,
      orgId: input.orgId,
      action: "customer_self_registration_invite_sent",
      entityType: "customer_self_registration",
      entityId: registration.id,
      metadata: { email: input.email, serviceTypeId: input.serviceTypeId },
    });

    return { registration, fillUrl };
  }

  private async compensate(
    registrationId: string,
    responseId: string | null,
  ): Promise<void> {
    try {
      await this.selfRegRepo.delete(registrationId);
    } catch (rollbackErr) {
      this.logger.error(
        `Falha ao reverter registro de auto-cadastro ${registrationId} após erro de e-mail`,
        rollbackErr instanceof Error ? rollbackErr.stack : undefined,
      );
    }

    if (responseId) {
      try {
        await this.anamnesisResponseRepo.delete(responseId);
      } catch (rollbackErr) {
        this.logger.error(
          `Falha ao reverter resposta de anamnese ${responseId} após erro de e-mail`,
          rollbackErr instanceof Error ? rollbackErr.stack : undefined,
        );
      }
    }
  }
}
