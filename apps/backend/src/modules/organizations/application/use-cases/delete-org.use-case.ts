import { Inject, Injectable } from "@nestjs/common";
import {
  IOrganizationRepository,
  ORGANIZATION_REPOSITORY,
} from "../../domain/org.repository.interface";
import { AuditService } from "../../../audit/audit.service";
import { OrgForbiddenException } from "../../domain/exceptions/org-forbidden.exception";
import { OrgNotFoundException } from "../../domain/exceptions/org-not-found.exception";

@Injectable()
export class DeleteOrgUseCase {
  constructor(
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly orgRepo: IOrganizationRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(orgId: string, authId: string): Promise<void> {
    const org = await this.orgRepo.findByIdAndAuthId(orgId, authId);
    if (!org) throw new OrgNotFoundException(orgId);

    const isOwner = await this.orgRepo.isOwner(orgId, authId);
    if (!isOwner) throw new OrgForbiddenException();

    await this.auditService.logByAuthId(authId, {
      orgId,
      action: "delete",
      entityType: "organization",
      entityId: orgId,
      metadata: { name: org.name, slug: org.slug },
    });

    await this.orgRepo.delete(orgId);
  }
}
