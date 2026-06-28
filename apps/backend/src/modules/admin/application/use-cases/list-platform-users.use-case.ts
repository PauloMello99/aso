import { Inject, Injectable } from "@nestjs/common";
import {
  AdminUserRow,
  ADMIN_REPOSITORY,
  IAdminRepository,
} from "../../domain/admin.repository.interface";

@Injectable()
export class ListPlatformUsersUseCase {
  constructor(
    @Inject(ADMIN_REPOSITORY) private readonly adminRepo: IAdminRepository,
  ) {}

  execute(): Promise<AdminUserRow[]> {
    return this.adminRepo.listUsers();
  }
}
