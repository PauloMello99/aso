import { Inject, Injectable } from "@nestjs/common";
import type { OrgEntity } from "../../domain/org.entity";
import {
  IOrganizationRepository,
  ORGANIZATION_REPOSITORY,
} from "../../domain/org.repository.interface";
import { OrgNotFoundException } from "../../domain/exceptions/org-not-found.exception";

@Injectable()
export class GetOrgUseCase {
  constructor(
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly orgRepo: IOrganizationRepository,
  ) {}

  async execute(orgId: string, authId: string): Promise<OrgEntity> {
    const org = await this.orgRepo.findByIdAndAuthId(orgId, authId);
    if (!org) throw new OrgNotFoundException(orgId);
    return org;
  }
}
