import { Inject, Injectable } from "@nestjs/common";
import {
  ICustomerSelfRegistrationRepository,
  CUSTOMER_SELF_REGISTRATION_REPOSITORY,
} from "../../domain/customer-self-registration.repository.interface";
import type { CustomerSelfRegistrationStatus } from "../../domain/customer-self-registration.entity";
import { CustomerSelfRegistrationNotFoundException } from "../../domain/exceptions/customer-self-registration-not-found.exception";
import { CustomerSelfRegistrationAlreadySubmittedException } from "../../domain/exceptions/customer-self-registration-already-submitted.exception";
import { CustomerSelfRegistrationExpiredException } from "../../domain/exceptions/customer-self-registration-expired.exception";
import {
  GetAnamnesisResponseByTokenUseCase,
  type GetAnamnesisResponseByTokenResult,
} from "../../../anamnesis/application/use-cases/get-anamnesis-response-by-token.use-case";

export interface GetCustomerSelfRegistrationByTokenInput {
  token: string;
}

/**
 * DTO de leitura PÚBLICO (sem sessão). Deliberadamente NÃO inclui `orgId`, ids
 * internos, `createdBy` nem qualquer dado de outro customer — minimização de PII
 * para um endpoint acessível por qualquer portador do token do convite.
 */
export interface GetCustomerSelfRegistrationByTokenResult {
  organizationName: string;
  email: string;
  serviceTypeName: string | null;
  status: CustomerSelfRegistrationStatus | "expired";
  expiresAt: Date;
  anamnesisForm: GetAnamnesisResponseByTokenResult | null;
}

@Injectable()
export class GetCustomerSelfRegistrationByTokenUseCase {
  constructor(
    @Inject(CUSTOMER_SELF_REGISTRATION_REPOSITORY)
    private readonly selfRegRepo: ICustomerSelfRegistrationRepository,
    private readonly getAnamnesisResponseByToken: GetAnamnesisResponseByTokenUseCase,
  ) {}

  async execute(
    input: GetCustomerSelfRegistrationByTokenInput,
  ): Promise<GetCustomerSelfRegistrationByTokenResult> {
    const registration = await this.selfRegRepo.findByToken(input.token);
    if (!registration) {
      throw new CustomerSelfRegistrationNotFoundException(input.token);
    }
    if (registration.displayStatus === "submitted") {
      throw new CustomerSelfRegistrationAlreadySubmittedException();
    }
    if (registration.isExpired) {
      throw new CustomerSelfRegistrationExpiredException();
    }

    const anamnesisForm = registration.anamnesisToken
      ? await this.getAnamnesisResponseByToken.execute(
          registration.anamnesisToken,
        )
      : null;

    return {
      organizationName: registration.organizationName,
      email: registration.email,
      serviceTypeName: registration.serviceTypeName,
      status: registration.displayStatus,
      expiresAt: registration.expiresAt,
      anamnesisForm,
    };
  }
}
