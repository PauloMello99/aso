import { Inject, Injectable } from "@nestjs/common";
import {
  ADMIN_REPOSITORY,
  IAdminRepository,
} from "../../domain/admin.repository.interface";
import { AuditService } from "../../../audit/audit.service";
import { PlatformTargetNotFoundException } from "../../domain/exceptions/platform-admin.exceptions";

@Injectable()
export class SetOrgSuspendedUseCase {
  constructor(
    @Inject(ADMIN_REPOSITORY) private readonly adminRepo: IAdminRepository,
    private readonly auditService: AuditService,
  ) {}

  async execute(
    orgId: string,
    suspended: boolean,
    actorAuthId: string,
  ): Promise<void> {
    const ok = await this.adminRepo.setOrgSuspended(orgId, suspended);
    if (!ok) throw new PlatformTargetNotFoundException(`org ${orgId}`);

    await this.auditService.logByAuthId(actorAuthId, {
      orgId,
      action: "update",
      entityType: "organization",
      entityId: orgId,
      metadata: { operation: suspended ? "suspend" : "unsuspend" },
    });
  }
}
