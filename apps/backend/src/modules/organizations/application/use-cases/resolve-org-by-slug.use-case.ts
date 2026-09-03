import { Inject, Injectable } from "@nestjs/common";
import type { OrgEntity } from "../../domain/org.entity";
import {
  IOrganizationRepository,
  ORGANIZATION_REPOSITORY,
} from "../../domain/org.repository.interface";
import { OrgNotFoundException } from "../../domain/exceptions/org-not-found.exception";
import { AuditService } from "../../../audit/audit.service";
import { isActingAsSuperAdmin } from "../../../../common/request-context/acting-context";

@Injectable()
export class ResolveOrgBySlugUseCase {
  constructor(
    @Inject(ORGANIZATION_REPOSITORY)
    private readonly orgRepo: IOrganizationRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(slug: string, authId: string): Promise<OrgEntity> {
    const org = await this.orgRepo.findBySlugAndAuthId(slug, authId);
    if (!org) throw new OrgNotFoundException(slug);

    // Lido DEPOIS do await: a marcação de "síntese de super_admin" acontece
    // dentro do repositório (markActingAsSuperAdmin em findBySlugAndAuthId),
    // então só há sinal a auditar após a resolução.
    if (isActingAsSuperAdmin()) {
      await this.auditService.logByAuthId(authId, {
        action: "org_admin_access",
        entityType: "organization",
        entityId: org.id,
        orgId: org.id,
        metadata: { slug: org.slug },
      });
    }

    return org;
  }
}
