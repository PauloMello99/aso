import { Inject, Injectable } from "@nestjs/common";
import type { OrgEntity } from "../../domain/org.entity";
import {
  IOrganizationRepository,
  ORGANIZATION_REPOSITORY,
} from "../../domain/org.repository.interface";
import { OrgNotFoundException } from "../../domain/exceptions/org-not-found.exception";

/**
 * Resolve uma org pela slug para o ator: membro (role real) ou super_admin
 * (role "owner" sintetizado). Usado pelo deep-link do super_admin para gerenciar
 * uma org alheia. 404 (sem vazar) para quem não é membro nem super_admin.
 */
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
