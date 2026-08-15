import { Inject, Injectable } from "@nestjs/common";
import {
  IAnamnesisResponseRepository,
  ANAMNESIS_RESPONSE_REPOSITORY,
  AnamnesisResponseListItem,
} from "../../domain/anamnesis-response.repository.interface";
import type { AnamnesisResponseStatus } from "../../domain/anamnesis-response.entity";

export interface ListAnamnesisResponsesInput {
  orgId: string;
  customerId?: string;
  serviceTypeId?: string;
  status?: AnamnesisResponseStatus;
}

@Injectable()
export class ListAnamnesisResponsesUseCase {
  constructor(
    @Inject(ANAMNESIS_RESPONSE_REPOSITORY)
    private readonly responseRepo: IAnamnesisResponseRepository,
  ) {}

  async execute(
    input: ListAnamnesisResponsesInput,
  ): Promise<AnamnesisResponseListItem[]> {
    return this.responseRepo.listByOrg(input.orgId, {
      customerId: input.customerId,
      serviceTypeId: input.serviceTypeId,
      status: input.status,
    });
  }
}
