import { Inject, Injectable } from "@nestjs/common";
import type { OrgEntity } from "../../domain/org.entity";
import {
  IOrganizationRepository,
  ORGANIZATION_REPOSITORY,
} from "../../domain/org.repository.interface";
import { AuditService } from "../../../audit/audit.service";
import { OrgForbiddenException } from "../../domain/exceptions/org-forbidden.exception";
import { OrgNotFoundException } from "../../domain/exceptions/org-not-found.exception";

@Injectable()
export class UpdateOrgUseCase {
  constructor(
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly orgRepo: IOrganizationRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    orgId: string,
    authId: string,
    data: { name?: string },
  ): Promise<OrgEntity> {
    const org = await this.orgRepo.findByIdAndAuthId(orgId, authId);
    if (!org) throw new OrgNotFoundException(orgId);

    const isOwner = await this.orgRepo.isOwner(orgId, authId);
    if (!isOwner) throw new OrgForbiddenException();

    const updated = await this.orgRepo.update(orgId, data);

    await this.auditService.logByAuthId(authId, {
      orgId,
      action: "update",
      entityType: "organization",
      entityId: orgId,
      metadata: { fields: Object.keys(data) },
    });

    return updated;
  }
}
