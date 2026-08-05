import { Inject, Injectable } from "@nestjs/common";
import {
  IAnamnesisResponseRepository,
  ANAMNESIS_RESPONSE_REPOSITORY,
} from "../../domain/anamnesis-response.repository.interface";
import {
  IAnamnesisFormRepository,
  ANAMNESIS_FORM_REPOSITORY,
} from "../../domain/anamnesis-form.repository.interface";

export interface ListLinkableAnamnesisResponsesInput {
  orgId: string;
  customerId: string;
  serviceTypeId: string;
}

export interface LinkableAnamnesisResponse {
  id: string;
  customerId: string | null;
  serviceTypeId: string | null;
  formVersionId: string | null;
  submittedAt: Date | null;
  createdAt: Date;
}

@Injectable()
export class ListLinkableAnamnesisResponsesUseCase {
  constructor(
    @Inject(ANAMNESIS_RESPONSE_REPOSITORY)
    private readonly responseRepo: IAnamnesisResponseRepository,
    @Inject(ANAMNESIS_FORM_REPOSITORY)
    private readonly formRepo: IAnamnesisFormRepository,
  ) {}

  async execute(
    input: ListLinkableAnamnesisResponsesInput,
  ): Promise<LinkableAnamnesisResponse[]> {
    const [responses, current] = await Promise.all([
      this.responseRepo.findLinkable(
        input.customerId,
        input.serviceTypeId,
        input.orgId,
      ),
      this.formRepo.getCurrentVersion(input.serviceTypeId, input.orgId),
    ]);

    // Espelha assert-anamnesis-response-linkable: sem versao vigente ou sem
    // formVersionId (ON DELETE SET NULL) nunca bloqueia o vinculo, entao
    // tambem nao deve ser filtrado fora do seletor.
    const eligible = current
      ? responses.filter(
          (response) =>
            response.formVersionId === null ||
            response.formVersionId === current.id,
        )
      : responses;

    return eligible.map((response) => ({
      id: response.id,
      customerId: response.customerId,
      serviceTypeId: response.serviceTypeId,
      formVersionId: response.formVersionId,
      submittedAt: response.submittedAt,
      createdAt: response.createdAt,
    }));
  }
}
