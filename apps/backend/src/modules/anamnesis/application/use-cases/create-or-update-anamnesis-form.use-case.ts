import { Inject, Injectable } from "@nestjs/common";
import {
  IAnamnesisFormRepository,
  ANAMNESIS_FORM_REPOSITORY,
} from "../../domain/anamnesis-form.repository.interface";
import type { AnamnesisQuestion } from "../../domain/anamnesis-question";
import type { AnamnesisFormVersionEntity } from "../../domain/anamnesis-form-version.entity";
import {
  IServiceTypeRepository,
  SERVICE_TYPE_REPOSITORY,
} from "../../../services/domain/service-type.repository.interface";
import { ServiceTypeNotFoundException } from "../../../services/domain/exceptions/service-type-not-found.exception";
import {
  IMemberRepository,
  MEMBER_REPOSITORY,
} from "../../../organizations/domain/member.repository.interface";
import { resolveMembership } from "../../../services/application/use-cases/resolve-membership";

export interface CreateOrUpdateAnamnesisFormInput {
  orgId: string;
  serviceTypeId: string;
  authId: string;
  questions: AnamnesisQuestion[];
}

@Injectable()
export class CreateOrUpdateAnamnesisFormUseCase {
  constructor(
    @Inject(ANAMNESIS_FORM_REPOSITORY)
    private readonly formRepo: IAnamnesisFormRepository,
    @Inject(SERVICE_TYPE_REPOSITORY)
    private readonly serviceTypeRepo: IServiceTypeRepository,
    @Inject(MEMBER_REPOSITORY)
    private readonly memberRepo: IMemberRepository,
  ) {}

  async execute(
    input: CreateOrUpdateAnamnesisFormInput,
  ): Promise<AnamnesisFormVersionEntity> {
    const serviceType = await this.serviceTypeRepo.findById(
      input.serviceTypeId,
      input.orgId,
    );
    if (!serviceType) {
      throw new ServiceTypeNotFoundException(input.serviceTypeId);
    }

    const { userId } = await resolveMembership(
      this.memberRepo,
      input.orgId,
      input.authId,
    );

    return this.formRepo.createVersion({
      orgId: input.orgId,
      serviceTypeId: input.serviceTypeId,
      questions: input.questions,
      createdBy: userId,
    });
  }
}
