import { Inject, Injectable, Logger } from "@nestjs/common";
import {
  ICustomerUpdateInvitationRepository,
  CUSTOMER_UPDATE_INVITATION_REPOSITORY,
} from "../../domain/customer-update-invitation.repository.interface";
import { CustomerUpdateInvitationNotFoundException } from "../../domain/exceptions/customer-update-invitation-not-found.exception";
import { CustomerUpdateInvitationAlreadySubmittedException } from "../../domain/exceptions/customer-update-invitation-already-submitted.exception";
import { CustomerUpdateInvitationExpiredException } from "../../domain/exceptions/customer-update-invitation-expired.exception";
import {
  IPublicCustomerWriter,
  PUBLIC_CUSTOMER_WRITER,
  type PublicCustomerCoreUpdate,
} from "../../domain/ports/public-customer-writer.port";
import { CustomerEmailAlreadyExistsException } from "../../../customers/domain/exceptions/customer-email-already-exists.exception";
import { AuditService } from "../../../audit/audit.service";

export interface SubmitCustomerUpdateInput extends PublicCustomerCoreUpdate {
  token: string;
}

export interface SubmitCustomerUpdateResult {
  customerId: string;
}

@Injectable()
export class SubmitCustomerUpdateUseCase {
  private readonly logger = new Logger(SubmitCustomerUpdateUseCase.name);

  constructor(
    @Inject(CUSTOMER_UPDATE_INVITATION_REPOSITORY)
    private readonly updateInviteRepo: ICustomerUpdateInvitationRepository,
    @Inject(PUBLIC_CUSTOMER_WRITER)
    private readonly publicCustomerWriter: IPublicCustomerWriter,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    input: SubmitCustomerUpdateInput,
  ): Promise<SubmitCustomerUpdateResult> {
    const { token, ...data } = input;

    const invitation = await this.updateInviteRepo.findByToken(token);
    if (!invitation) {
      throw new CustomerUpdateInvitationNotFoundException(token);
    }
    if (invitation.displayStatus === "submitted") {
      throw new CustomerUpdateInvitationAlreadySubmittedException();
    }
    if (invitation.isExpired) {
      throw new CustomerUpdateInvitationExpiredException();
    }

    // Abordagem escolhida (a mais simples das duas sugeridas): só consulta
    // `findByEmailInOrg` quando o e-mail informado realmente muda em relação ao
    // e-mail atual do customer (comparação case/trim-insensitive) — evita uma
    // query desnecessária no caminho comum em que o e-mail não é alterado, e
    // dispensa lidar com "self-match" porque a condição já exclui esse caso.
    const emailChanged =
      data.email !== undefined &&
      data.email.trim().toLowerCase() !==
        invitation.customerEmail.trim().toLowerCase();

    if (emailChanged && data.email) {
      const conflicting = await this.publicCustomerWriter.findByEmailInOrg(
        invitation.orgId,
        data.email,
        invitation.customerId,
      );
      if (conflicting) {
        throw new CustomerEmailAlreadyExistsException(data.email);
      }
    }

    const customer = await this.publicCustomerWriter.updateCoreFields(
      invitation.customerId,
      invitation.orgId,
      data,
    );
    if (!customer) {
      this.logger.error(
        `updateCoreFields não encontrou o customer ${invitation.customerId} na org ${invitation.orgId} (invitation ${invitation.id})`,
      );
      throw new Error(
        `Failed to update customer ${invitation.customerId} during self-service update submit`,
      );
    }

    const marked = await this.updateInviteRepo.markSubmitted(invitation.id);
    if (!marked) {
      // Não propaga: o trabalho durável (customer atualizado) já ocorreu. Mesmo
      // padrão de `SubmitCustomerSelfRegistrationUseCase` — uma eventual segunda
      // tentativa cai em AlreadySubmitted/NotFound, o que é aceitável.
      this.logger.error(
        `markSubmitted não encontrou invitation pending para ${invitation.id} (customer ${customer.id}) — provável corrida com outra tentativa`,
      );
    }

    await this.auditService.log({
      actorId: null,
      orgId: invitation.orgId,
      action: "customer_self_updated",
      entityType: "customer",
      entityId: invitation.customerId,
      metadata: {
        invitationId: invitation.id,
        changedFields: Object.entries(data)
          .filter(([, value]) => value !== undefined)
          .map(([key]) => key),
      },
    });

    return { customerId: invitation.customerId };
  }
}
