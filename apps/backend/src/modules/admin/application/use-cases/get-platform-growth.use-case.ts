import { Inject, Injectable } from "@nestjs/common";
import {
  ADMIN_REPOSITORY,
  GrowthPoint,
  IAdminRepository,
} from "../../domain/admin.repository.interface";

@Injectable()
export class GetPlatformGrowthUseCase {
  constructor(
    @Inject(ADMIN_REPOSITORY) private readonly adminRepo: IAdminRepository,
  ) {}

  execute(): Promise<GrowthPoint[]> {
    return this.adminRepo.getGrowthSeries();
  }
}
