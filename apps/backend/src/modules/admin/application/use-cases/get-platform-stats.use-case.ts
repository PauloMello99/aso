import { Inject, Injectable } from "@nestjs/common";
import {
  ADMIN_REPOSITORY,
  IAdminRepository,
  PlatformStats,
} from "../../domain/admin.repository.interface";

@Injectable()
export class GetPlatformStatsUseCase {
  constructor(
    @Inject(ADMIN_REPOSITORY) private readonly adminRepo: IAdminRepository,
  ) {}

  execute(): Promise<PlatformStats> {
    return this.adminRepo.getStats();
  }
}
