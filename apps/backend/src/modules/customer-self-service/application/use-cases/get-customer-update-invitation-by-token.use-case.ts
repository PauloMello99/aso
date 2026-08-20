import { Inject, Injectable } from "@nestjs/common";
import {
  ICustomerUpdateInvitationRepository,
  CUSTOMER_UPDATE_INVITATION_REPOSITORY,
} from "../../domain/customer-update-invitation.repository.interface";
import type { CustomerUpdateInvitationStatus } from "../../domain/customer-update-invitation.entity";
import { CustomerUpdateInvitationNotFoundException } from "../../domain/exceptions/customer-update-invitation-not-found.exception";
import { CustomerUpdateInvitationAlreadySubmittedException } from "../../domain/exceptions/customer-update-invitation-already-submitted.exception";
import { CustomerUpdateInvitationExpiredException } from "../../domain/exceptions/customer-update-invitation-expired.exception";

export interface GetCustomerUpdateInvitationByTokenInput {
  token: string;
}

/** Snapshot dos dados cadastrais atuais do customer, para pré-preencher o formulário. */
export interface CustomerUpdateInvitationCustomerSnapshot {
  name: string;
  email: string;
  phone: string | null;
  birthDate: string;
  address: string;
  number: string;
  addressLine2: string | null;
  city: string;
  state: string;
  postalCode: string | null;
  country: string | null;
}

/**
 * DTO de leitura PÚBLICO (sem sessão). Deliberadamente NÃO inclui `orgId`, ids
 * internos, `createdBy` nem `customerId` — minimização de PII para um endpoint
 * acessível por qualquer portador do token do convite.
 */
export interface GetCustomerUpdateInvitationByTokenResult {
  organizationName: string;
  status: CustomerUpdateInvitationStatus | "expired";
  expiresAt: Date;
  customer: CustomerUpdateInvitationCustomerSnapshot;
}

@Injectable()
export class GetCustomerUpdateInvitationByTokenUseCase {
  constructor(
    @Inject(CUSTOMER_UPDATE_INVITATION_REPOSITORY)
    private readonly updateInviteRepo: ICustomerUpdateInvitationRepository,
  ) {}

  async execute(
    input: GetCustomerUpdateInvitationByTokenInput,
  ): Promise<GetCustomerUpdateInvitationByTokenResult> {
    const invitation = await this.updateInviteRepo.findByToken(input.token);
    if (!invitation) {
      throw new CustomerUpdateInvitationNotFoundException(input.token);
    }
    if (invitation.displayStatus === "submitted") {
      throw new CustomerUpdateInvitationAlreadySubmittedException();
    }
    if (invitation.isExpired) {
      throw new CustomerUpdateInvitationExpiredException();
    }

    return {
      organizationName: invitation.organizationName,
      status: invitation.displayStatus,
      expiresAt: invitation.expiresAt,
      customer: {
        name: invitation.customerName,
        email: invitation.customerEmail,
        phone: invitation.customerPhone,
        birthDate: invitation.customerBirthDate,
        address: invitation.customerAddress,
        number: invitation.customerNumber,
        addressLine2: invitation.customerAddressLine2,
        city: invitation.customerCity,
        state: invitation.customerState,
        postalCode: invitation.customerPostalCode,
        country: invitation.customerCountry,
      },
    };
  }
}
