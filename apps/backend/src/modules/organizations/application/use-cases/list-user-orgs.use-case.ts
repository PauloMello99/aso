import { Inject, Injectable } from "@nestjs/common";
import type { OrgEntity } from "../../domain/org.entity";
import {
  IOrganizationRepository,
  ORGANIZATION_REPOSITORY,
} from "../../domain/org.repository.interface";

@Injectable()
export class ListUserOrgsUseCase {
  constructor(
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly orgRepo: IOrganizationRepository,
  ) {}

  execute(authId: string): Promise<OrgEntity[]> {
    return this.orgRepo.findAllByAuthId(authId);
  }
}
