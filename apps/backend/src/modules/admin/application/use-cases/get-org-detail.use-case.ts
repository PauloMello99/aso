import { Inject, Injectable } from "@nestjs/common";
import {
  AdminOrgDetail,
  ADMIN_REPOSITORY,
  IAdminRepository,
} from "../../domain/admin.repository.interface";
import { PlatformTargetNotFoundException } from "../../domain/exceptions/platform-admin.exceptions";

@Injectable()
export class GetOrgDetailUseCase {
  constructor(
    @Inject(ADMIN_REPOSITORY) private readonly adminRepo: IAdminRepository,
  ) {}

  async execute(orgId: string): Promise<AdminOrgDetail> {
    const detail = await this.adminRepo.getOrgDetail(orgId);
    if (!detail) throw new PlatformTargetNotFoundException(`org ${orgId}`);
    return detail;
  }
}
