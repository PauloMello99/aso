import { Inject, Injectable } from "@nestjs/common";
import { AuthUser } from "../application/ports/auth-provider.interface";
import {
  IStorageProvider,
  STORAGE_PROVIDER,
} from "../application/ports/storage-provider.interface";
import { UserEntity } from "../../user/domain/user.entity";
import {
  IUserRepository,
  USER_REPOSITORY,
} from "../../user/domain/user.repository.interface";

@Injectable()
export class UploadAvatarUseCase {
  constructor(
    @Inject(STORAGE_PROVIDER) private readonly storage: IStorageProvider,
    @Inject(USER_REPOSITORY) private readonly userRepo: IUserRepository,
  ) {}

  async execute(
    authUser: AuthUser,
    file: Buffer,
    contentType: string,
  ): Promise<UserEntity> {
    const url = await this.storage.uploadAvatar(authUser.id, file, contentType);
    return this.userRepo.update(authUser.id, { avatarUrl: url });
  }
}
