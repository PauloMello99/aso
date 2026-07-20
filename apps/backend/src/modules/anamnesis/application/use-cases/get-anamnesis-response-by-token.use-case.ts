import { Inject, Injectable } from "@nestjs/common";
import {
  IAnamnesisResponseRepository,
  ANAMNESIS_RESPONSE_REPOSITORY,
} from "../../domain/anamnesis-response.repository.interface";
import { AnamnesisResponseNotFoundException } from "../../domain/exceptions/anamnesis-response-not-found.exception";
import type { AnamnesisQuestion } from "../../domain/anamnesis-question";
import type { AnamnesisResponseStatus } from "../../domain/anamnesis-response.entity";

export interface GetAnamnesisResponseByTokenResult {
  questions: AnamnesisQuestion[];
  customerName: string;
  status: AnamnesisResponseStatus | "expired";
  expiresAt: Date;
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
      status: response.displayStatus,
      expiresAt: response.expiresAt,
    };
  }
}
