import { Inject, Injectable } from "@nestjs/common";
import {
  ADMIN_REPOSITORY,
  IAdminRepository,
} from "../../domain/admin.repository.interface";
import { PlatformTargetNotFoundException } from "../../domain/exceptions/platform-admin.exceptions";

@Injectable()
export class SetOrgSuspendedUseCase {
  constructor(
    @Inject(ADMIN_REPOSITORY) private readonly adminRepo: IAdminRepository,
  ) {}

  async execute(orgId: string, suspended: boolean): Promise<void> {
    const ok = await this.adminRepo.setOrgSuspended(orgId, suspended);
    if (!ok) throw new PlatformTargetNotFoundException(`org ${orgId}`);
  }
}
