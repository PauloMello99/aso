import { Inject, Injectable } from "@nestjs/common";
import type { OrgEntity } from "../../domain/org.entity";
import {
  IOrganizationRepository,
  ORGANIZATION_REPOSITORY,
} from "../../domain/org.repository.interface";
import { OrgNotFoundException } from "../../domain/exceptions/org-not-found.exception";

@Injectable()
export class ResolveOrgBySlugUseCase {
  constructor(
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly orgRepo: IOrganizationRepository,
  ) {}

  async execute(slug: string, authId: string): Promise<OrgEntity> {
    const org = await this.orgRepo.findBySlugAndAuthId(slug, authId);
    if (!org) throw new OrgNotFoundException(slug);
    return org;
  }
}
