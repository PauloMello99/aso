import { Inject, Injectable } from "@nestjs/common";
import {
  IAnamnesisResponseRepository,
  ANAMNESIS_RESPONSE_REPOSITORY,
} from "../../domain/anamnesis-response.repository.interface";
import { AnamnesisResponseNotFoundException } from "../../domain/exceptions/anamnesis-response-not-found.exception";
import {
  buildAnamnesisConsentText,
  type AnamnesisConsentText,
} from "../../domain/build-anamnesis-consent-text";
import type { AnamnesisQuestion } from "../../domain/anamnesis-question";
import type { AnamnesisResponseStatus } from "../../domain/anamnesis-response.entity";

export interface GetAnamnesisResponseByTokenResult {
  questions: AnamnesisQuestion[];
  customerName: string;
  organizationName: string;
  status: AnamnesisResponseStatus | "expired";
  expiresAt: Date;
  consent: AnamnesisConsentText;
}

@Injectable()
export class GetAnamnesisResponseByTokenUseCase {
  constructor(
    @Inject(ANAMNESIS_RESPONSE_REPOSITORY)
    private readonly responseRepo: IAnamnesisResponseRepository,
  ) {}

  async execute(
    token: string,
  ): Promise<GetAnamnesisResponseByTokenResult> {
    const response = await this.responseRepo.findByToken(token);
    if (!response) throw new AnamnesisResponseNotFoundException(token);

    return {
      questions: response.questionsSnapshot,
      customerName: response.customerName.split(" ")[0] ?? "",
      organizationName: response.organizationName,
      status: response.displayStatus,
      expiresAt: response.expiresAt,
      consent: buildAnamnesisConsentText({ orgName: response.organizationName }),
    };
  }
}
