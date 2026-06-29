import { Inject, Injectable } from "@nestjs/common";
import {
  AdminUserDetail,
  ADMIN_REPOSITORY,
  IAdminRepository,
} from "../../domain/admin.repository.interface";
import { PlatformTargetNotFoundException } from "../../domain/exceptions/platform-admin.exceptions";

@Injectable()
export class GetUserDetailUseCase {
  constructor(
    @Inject(ADMIN_REPOSITORY) private readonly adminRepo: IAdminRepository,
  ) {}

  async execute(userId: string): Promise<AdminUserDetail> {
    const detail = await this.adminRepo.getUserDetail(userId);
    if (!detail) throw new PlatformTargetNotFoundException(`user ${userId}`);
    return detail;
  }
}
