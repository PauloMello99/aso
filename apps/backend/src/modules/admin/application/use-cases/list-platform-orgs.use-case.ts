import { Inject, Injectable } from "@nestjs/common";
import {
  AdminOrgRow,
  ADMIN_REPOSITORY,
  IAdminRepository,
} from "../../domain/admin.repository.interface";

@Injectable()
export class ListPlatformOrgsUseCase {
  constructor(
    @Inject(ADMIN_REPOSITORY) private readonly adminRepo: IAdminRepository,
  ) {}

  execute(): Promise<AdminOrgRow[]> {
    return this.adminRepo.listOrgs();
  }
}
