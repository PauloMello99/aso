import { Inject, Injectable } from "@nestjs/common";
import {
  IAnamnesisFormRepository,
  ANAMNESIS_FORM_REPOSITORY,
} from "../../domain/anamnesis-form.repository.interface";
import type { AnamnesisFormVersionEntity } from "../../domain/anamnesis-form-version.entity";

@Injectable()
export class GetCurrentAnamnesisFormVersionUseCase {
  constructor(
    @Inject(ANAMNESIS_FORM_REPOSITORY)
    private readonly formRepo: IAnamnesisFormRepository,
  ) {}

  execute(
    serviceTypeId: string,
    orgId: string,
  ): Promise<AnamnesisFormVersionEntity | null> {
    return this.formRepo.getCurrentVersion(serviceTypeId, orgId);
  }
}
