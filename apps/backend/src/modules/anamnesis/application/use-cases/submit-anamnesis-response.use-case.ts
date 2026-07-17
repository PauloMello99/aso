import { Inject, Injectable } from "@nestjs/common";
import {
  IAnamnesisResponseRepository,
  ANAMNESIS_RESPONSE_REPOSITORY,
} from "../../domain/anamnesis-response.repository.interface";
import type { AnamnesisAnswer } from "../../domain/anamnesis-response.entity";
import { AnamnesisResponseNotFoundException } from "../../domain/exceptions/anamnesis-response-not-found.exception";
import { AnamnesisResponseAlreadySubmittedException } from "../../domain/exceptions/anamnesis-response-already-submitted.exception";
import { AnamnesisResponseExpiredException } from "../../domain/exceptions/anamnesis-response-expired.exception";
import { validateAnamnesisAnswers } from "../../domain/validate-anamnesis-answers";

export interface SubmitAnamnesisResponseInput {
  token: string;
  answers: AnamnesisAnswer[];
}

@Injectable()
export class SubmitAnamnesisResponseUseCase {
  constructor(
    @Inject(ANAMNESIS_RESPONSE_REPOSITORY)
    private readonly responseRepo: IAnamnesisResponseRepository,
  ) {}

  async execute(input: SubmitAnamnesisResponseInput): Promise<void> {
    const response = await this.responseRepo.findByToken(input.token);
    if (!response) throw new AnamnesisResponseNotFoundException(input.token);

    if (response.displayStatus === "submitted") {
      throw new AnamnesisResponseAlreadySubmittedException();
    }
    if (response.isExpired) {
      throw new AnamnesisResponseExpiredException();
    }

    const normalized = validateAnamnesisAnswers(
      response.questionsSnapshot,
      input.answers,
    );

    // Sem auditService.log aqui: não há ator autenticado no fluxo público — o
    // próprio submittedAt + answers gravados na linha já é o registro auditável.
    await this.responseRepo.markSubmitted(response.id, normalized);
  }
}
