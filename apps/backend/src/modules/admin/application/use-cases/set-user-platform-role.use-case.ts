import { Inject, Injectable } from "@nestjs/common";
import {
  ADMIN_REPOSITORY,
  IAdminRepository,
  PlatformRole,
} from "../../domain/admin.repository.interface";
import { AuditService } from "../../../audit/audit.service";
import {
  CannotChangeOwnPlatformRoleException,
  PlatformTargetNotFoundException,
} from "../../domain/exceptions/platform-admin.exceptions";

@Injectable()
export class SetUserPlatformRoleUseCase {
  constructor(
    @Inject(ADMIN_REPOSITORY) private readonly adminRepo: IAdminRepository,
    private readonly auditService: AuditService,
  ) {}

  /**
   * @param actingAuthId auth id do super_admin que executa a ação (impede que
   *   ele altere o próprio papel e cause lockout).
   */
  async execute(
    targetUserId: string,
    role: PlatformRole,
    actingAuthId: string,
  ): Promise<void> {
    const target = await this.adminRepo.findUserById(targetUserId);
    if (!target) {
      throw new PlatformTargetNotFoundException(`user ${targetUserId}`);
    }
    if (target.authId === actingAuthId) {
      throw new CannotChangeOwnPlatformRoleException();
    }

    const previousRole = target.platformRole;
    await this.adminRepo.setUserPlatformRole(targetUserId, role);

    await this.auditService.logByAuthId(actingAuthId, {
      action: "update",
      entityType: "user",
      entityId: targetUserId,
      metadata: { from: previousRole, to: role },
    });
  }
}
