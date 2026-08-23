import { Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  IAnamnesisResponseRepository,
  ANAMNESIS_RESPONSE_REPOSITORY,
} from "../../domain/anamnesis-response.repository.interface";
import type { AnamnesisResponseEntity } from "../../domain/anamnesis-response.entity";
import { AnamnesisFormNotConfiguredException } from "../../domain/exceptions/anamnesis-form-not-configured.exception";
import { AnamnesisInviteEmailFailedException } from "../../domain/exceptions/anamnesis-invite-email-failed.exception";
import { AnamnesisAlreadyAnsweredCurrentVersionException } from "../../domain/exceptions/anamnesis-already-answered-current-version.exception";
import { GetCurrentAnamnesisFormVersionUseCase } from "./get-current-anamnesis-form-version.use-case";
import {
  ICustomerRepository,
  CUSTOMER_REPOSITORY,
} from "../../../customers/domain/customer.repository.interface";
import { CustomerNotFoundException } from "../../../customers/domain/exceptions/customer-not-found.exception";
import {
  IMemberRepository,
  MEMBER_REPOSITORY,
} from "../../../organizations/domain/member.repository.interface";
import { resolveMembership } from "../../../services/application/use-cases/resolve-membership";
import { MailService } from "../../../mail/application/mail.service";
import { AuditService } from "../../../audit/audit.service";

export interface SendAnamnesisInviteInput {
  orgId: string;
  authId: string;
  customerId: string;
  serviceTypeId: string;
}

export interface SendAnamnesisInviteResult {
  response: AnamnesisResponseEntity;
  fillUrl: string;
  resent: boolean;
}

@Injectable()
export class SendAnamnesisInviteUseCase {
  private readonly logger = new Logger(SendAnamnesisInviteUseCase.name);

  constructor(
    @Inject(ANAMNESIS_RESPONSE_REPOSITORY)
    private readonly responseRepo: IAnamnesisResponseRepository,
    @Inject(CUSTOMER_REPOSITORY)
    private readonly customerRepo: ICustomerRepository,
    @Inject(MEMBER_REPOSITORY)
    private readonly memberRepo: IMemberRepository,
    private readonly getCurrentVersion: GetCurrentAnamnesisFormVersionUseCase,
    private readonly mail: MailService,
    private readonly config: ConfigService,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    input: SendAnamnesisInviteInput,
  ): Promise<SendAnamnesisInviteResult> {
    const { userId } = await resolveMembership(
      this.memberRepo,
      input.orgId,
      input.authId,
    );

    const customer = await this.customerRepo.findById(
      input.customerId,
      input.orgId,
    );
    if (!customer) throw new CustomerNotFoundException(input.customerId);

    const version = await this.getCurrentVersion.execute(
      input.serviceTypeId,
      input.orgId,
    );
    if (!version) {
      throw new AnamnesisFormNotConfiguredException(input.serviceTypeId);
    }

    const answered = await this.responseRepo.findSubmittedForVersion(
      input.customerId,
      version.id,
      input.orgId,
    );
    if (answered) {
      throw new AnamnesisAlreadyAnsweredCurrentVersionException(
        answered.id,
        answered.submittedAt,
      );
    }

    const pending = await this.responseRepo.findPendingFor(
      input.customerId,
      input.serviceTypeId,
      input.orgId,
    );

    let response: AnamnesisResponseEntity;
    let createdNew: boolean;

    if (pending && !pending.isExpired && pending.formVersionId === version.id) {
      // Reenvio: reutiliza o convite pendente vigente (mesmo token), sem
      // estender o prazo de expiração.
      response = pending;
      createdNew = false;
    } else {
      await this.responseRepo.deletePendingFor(
        input.customerId,
        input.serviceTypeId,
        input.orgId,
      );

      response = await this.responseRepo.create({
        orgId: input.orgId,
        formVersionId: version.id,
        serviceTypeId: input.serviceTypeId,
        customerId: input.customerId,
        questionsSnapshot: version.questions,
        createdBy: userId,
      });
      createdNew = true;
    }

    const frontendUrl = this.config.get<string>(
      "FRONTEND_URL",
      "http://localhost:3000",
    );
    const fillUrl = `${frontendUrl}/anamnesis/${response.token}`;

    try {
      await this.mail.sendAnamnesisLink({
        to: customer.email,
        customerName: customer.name,
        fillUrl,
      });
    } catch (err) {
      this.logger.error(
        `Falha ao enviar link de anamnese (response ${response.id}, customer ${input.customerId}); ${
          createdNew
            ? "resposta será desfeita pelo rollback da transação"
            : "convite pendente preexistente preservado"
        }: ${err instanceof Error ? err.message : String(err)}`,
      );
      throw new AnamnesisInviteEmailFailedException(customer.email);
    }

    await this.auditService.log({
      actorId: userId,
      orgId: input.orgId,
      action: createdNew ? "anamnesis_invite_sent" : "anamnesis_invite_resent",
      entityType: "anamnesis_response",
      entityId: response.id,
      metadata: { customerId: input.customerId, serviceTypeId: input.serviceTypeId },
    });

    return { response, fillUrl, resent: !createdNew };
  }
}
